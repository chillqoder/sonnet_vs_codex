import * as cheerio from "cheerio";
import { absoluteUrl, fetchHtml } from "../../utils/http.js";
import { normalizeMovie, movieKey } from "../normalize.js";

const SOURCE = "IMDb";
const IMDB_BASE = "https://www.imdb.com";

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractFromJsonLd($) {
  const parsed = [];

  $("script[type='application/ld+json']").each((_, element) => {
    const payload = parseJson($(element).text());
    if (!payload) {
      return;
    }

    const blocks = Array.isArray(payload) ? payload : [payload];

    for (const block of blocks) {
      if (block?.["@type"] !== "ItemList" || !Array.isArray(block.itemListElement)) {
        continue;
      }

      for (const entry of block.itemListElement) {
        const item = entry.item ?? entry;
        parsed.push({
          title: item?.name,
          year: item?.datePublished,
          poster: item?.image,
          genres: Array.isArray(item?.genre)
            ? item.genre
            : String(item?.genre ?? "")
                .split(",")
                .map((genre) => genre.trim())
                .filter(Boolean),
          rating: item?.aggregateRating?.ratingValue,
          description: item?.description,
          source: SOURCE,
          link: absoluteUrl(IMDB_BASE, item?.url)
        });
      }
    }
  });

  return parsed;
}

function extractFromCards($) {
  const parsed = [];

  $("li.ipc-metadata-list-summary-item").each((_, element) => {
    const node = $(element);
    const title =
      node
        .find("h3")
        .first()
        .text()
        .replace(/^\d+\.\s*/, "") || node.find("a h3").first().text();

    const link = absoluteUrl(
      IMDB_BASE,
      node.find("a.ipc-title-link-wrapper").attr("href") ?? node.find("a").first().attr("href")
    );

    const poster = node.find("img").first().attr("src");
    const description = node.find(".ipc-html-content-inner-div").first().text();
    const metadata = node.find(".dli-title-metadata-item").map((_, el) => $(el).text()).get();
    const year = metadata.find((item) => /\b(19|20)\d{2}\b/.test(item));
    const rating =
      node.find("span[aria-label*='IMDb rating']").first().text() ||
      node.find(".ipc-rating-star--rating").first().text();

    parsed.push({
      title,
      year,
      poster,
      genres: [],
      rating,
      description,
      source: SOURCE,
      link
    });
  });

  return parsed;
}

export async function scrapeImdb({ query, genre, mood }) {
  const params = new URLSearchParams();

  if (query) {
    params.set("title", query);
  }

  if (genre) {
    params.set("genres", genre.toLowerCase());
  }

  const keywordParts = [mood, query].filter(Boolean);
  if (keywordParts.length > 0) {
    params.set("keywords", keywordParts.join(" "));
  }

  params.set("title_type", "feature");
  params.set("sort", "moviemeter,asc");
  params.set("count", "50");

  const url = `${IMDB_BASE}/search/title/?${params.toString()}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const raw = [...extractFromJsonLd($), ...extractFromCards($)];

  const deduped = new Map();
  for (const movie of raw) {
    const normalized = normalizeMovie(movie);
    if (!normalized) {
      continue;
    }

    deduped.set(movieKey(normalized), normalized);
  }

  return Array.from(deduped.values());
}

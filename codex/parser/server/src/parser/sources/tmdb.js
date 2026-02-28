import * as cheerio from "cheerio";
import { absoluteUrl, fetchHtml } from "../../utils/http.js";
import { normalizeMovie, movieKey } from "../normalize.js";

const SOURCE = "TMDB";
const TMDB_BASE = "https://www.themoviedb.org";

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonLd($) {
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
          rating: item?.aggregateRating?.ratingValue,
          description: item?.description,
          source: SOURCE,
          link: absoluteUrl(TMDB_BASE, item?.url),
          genres: Array.isArray(item?.genre) ? item.genre : []
        });
      }
    }
  });

  return parsed;
}

function extractCards($) {
  const parsed = [];

  $("div.card.v4.tight, div.card").each((_, element) => {
    const node = $(element);

    let titleLink = null;
    const selectors = [".content .title a", "h2 a", "a.result", "a[href*='/movie/']"];
    for (const selector of selectors) {
      const candidate = node.find(selector).first();
      if (candidate.length > 0) {
        titleLink = candidate;
        break;
      }
    }

    if (!titleLink) {
      return;
    }

    const title = titleLink.text();
    const link = absoluteUrl(TMDB_BASE, titleLink.attr("href"));

    if (!title || !link) {
      return;
    }

    const poster = absoluteUrl(
      TMDB_BASE,
      node.find(".image img").first().attr("src") ?? node.find("img").first().attr("src")
    );
    const year = node.find(".release_date").first().text();
    const description = node.find(".overview").first().text();
    const rating =
      node.find(".user_score_chart").first().attr("data-percent") ??
      node.find(".consensus").first().text();

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

export async function scrapeTmdb({ query, genre, mood }) {
  const term = [query, genre, mood].filter(Boolean).join(" ").trim();
  const params = new URLSearchParams({ query: term || "movie" });
  const url = `${TMDB_BASE}/search/movie?${params.toString()}`;

  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const raw = [...extractJsonLd($), ...extractCards($)];

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

import { inferMoods } from "./mood.js";

const GENRE_MAP = {
  "sci fi": "Sci-Fi",
  scifi: "Sci-Fi",
  "science fiction": "Sci-Fi",
  romcom: "Romance",
  animated: "Animation",
  doc: "Documentary"
};

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeYear(year) {
  const match = String(year ?? "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function normalizeRating(rating) {
  const raw = cleanText(rating);
  const match = raw.match(/\d+(\.\d+)?/);
  if (!match) {
    return "N/A";
  }

  let value = Number(match[0]);
  if (raw.includes("%") || value > 10) {
    value = value / 10;
  }

  if (!Number.isFinite(value) || value <= 0 || value > 10) {
    return "N/A";
  }

  return value.toFixed(1);
}

function normalizeGenre(genre) {
  const raw = cleanText(genre);
  if (!raw) {
    return null;
  }

  const lowered = raw.toLowerCase();
  const mapped = GENRE_MAP[lowered];
  if (mapped) {
    return mapped;
  }

  if (lowered === "sci-fi") {
    return "Sci-Fi";
  }

  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function normalizeMovie(rawMovie) {
  const title = cleanText(rawMovie.title);
  const link = cleanText(rawMovie.link);

  if (!title || !link) {
    return null;
  }

  const genres = (Array.isArray(rawMovie.genres) ? rawMovie.genres : [])
    .map(normalizeGenre)
    .filter(Boolean);

  const description = cleanText(rawMovie.description);

  const moods = inferMoods({
    genres,
    text: `${title} ${description}`,
    hints: rawMovie.moodHints ?? []
  });

  return {
    title,
    year: normalizeYear(rawMovie.year),
    poster: cleanText(rawMovie.poster),
    genres,
    rating: normalizeRating(rawMovie.rating),
    description,
    source: cleanText(rawMovie.source) || "Unknown",
    link,
    moods
  };
}

export function movieKey(movie) {
  return `${movie.title.toLowerCase()}::${movie.year ?? "unknown"}`;
}

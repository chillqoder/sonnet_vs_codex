import { config } from "../config.js";
import { normalizeMoodFilter } from "./mood.js";
import { movieKey } from "./normalize.js";
import { scrapeImdb } from "./sources/imdb.js";
import { scrapeTmdb } from "./sources/tmdb.js";

const sources = [
  { name: "IMDb", execute: scrapeImdb },
  { name: "TMDB", execute: scrapeTmdb }
];

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Source timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function mergeMovies(existing, incoming) {
  const sourceSet = new Set(
    [...String(existing.source ?? "").split(","), ...String(incoming.source ?? "").split(",")]
      .map((item) => item.trim())
      .filter(Boolean)
  );

  return {
    ...existing,
    poster: existing.poster || incoming.poster,
    rating:
      existing.rating === "N/A"
        ? incoming.rating
        : incoming.rating === "N/A"
          ? existing.rating
          : Number(existing.rating) >= Number(incoming.rating)
            ? existing.rating
            : incoming.rating,
    description:
      incoming.description.length > existing.description.length
        ? incoming.description
        : existing.description,
    genres: Array.from(new Set([...existing.genres, ...incoming.genres])),
    moods: Array.from(new Set([...(existing.moods ?? []), ...(incoming.moods ?? [])])),
    source: Array.from(sourceSet).join(", ")
  };
}

function filterMovies(movies, { query, genre, mood }) {
  const loweredQuery = String(query ?? "")
    .trim()
    .toLowerCase();
  const loweredGenre = String(genre ?? "")
    .trim()
    .toLowerCase();
  const normalizedMood = normalizeMoodFilter(mood).toLowerCase();

  return movies.filter((movie) => {
    const matchesQuery =
      !loweredQuery ||
      movie.title.toLowerCase().includes(loweredQuery) ||
      movie.description.toLowerCase().includes(loweredQuery);

    const matchesGenre =
      !loweredGenre || movie.genres.some((item) => item.toLowerCase() === loweredGenre);

    const matchesMood =
      !normalizedMood || movie.moods.some((item) => item.toLowerCase() === normalizedMood);

    return matchesQuery && matchesGenre && matchesMood;
  });
}

function sortMovies(movies) {
  return movies.toSorted((a, b) => {
    const ratingA = a.rating === "N/A" ? -1 : Number(a.rating);
    const ratingB = b.rating === "N/A" ? -1 : Number(b.rating);
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }

    return (b.year ?? 0) - (a.year ?? 0);
  });
}

export async function parseMovies(criteria) {
  const sourceRuns = await Promise.all(
    sources.map(async ({ name, execute }) => {
      try {
        const movies = await withTimeout(execute(criteria), config.sourceTimeoutMs);
        return { name, movies, ok: true };
      } catch (error) {
        return { name, movies: [], ok: false, error: error.message };
      }
    })
  );

  const merged = new Map();
  for (const run of sourceRuns) {
    for (const movie of run.movies) {
      const key = movieKey(movie);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, movie);
      } else {
        merged.set(key, mergeMovies(existing, movie));
      }
    }
  }

  const filtered = filterMovies(Array.from(merged.values()), criteria);
  const sorted = sortMovies(filtered).slice(0, config.maxResults);

  return {
    movies: sorted,
    sourceStatus: sourceRuns.map((run) => ({
      source: run.name,
      ok: run.ok,
      error: run.error ?? null,
      count: run.movies.length
    }))
  };
}

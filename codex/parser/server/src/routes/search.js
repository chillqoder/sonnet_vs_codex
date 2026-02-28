import { Router } from "express";
import { config } from "../config.js";
import { parseMovies } from "../parser/index.js";
import { TtlCache } from "../utils/cache.js";

const router = Router();
const cache = new TtlCache(config.cacheTtlMs);

function buildCacheKey({ q, genre, mood }) {
  return JSON.stringify({
    q: String(q ?? "").trim().toLowerCase(),
    genre: String(genre ?? "").trim().toLowerCase(),
    mood: String(mood ?? "").trim().toLowerCase()
  });
}

router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const genre = String(req.query.genre ?? "").trim();
    const mood = String(req.query.mood ?? "").trim();
    const parsedPage = Number.parseInt(String(req.query.page ?? "1"), 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const parsedPerPage = Number.parseInt(String(req.query.perPage ?? config.defaultPerPage), 10);
    const requestedPerPage = Number.isFinite(parsedPerPage) ? parsedPerPage : config.defaultPerPage;
    const perPage = Math.max(1, Math.min(config.maxPerPage, requestedPerPage));

    const key = buildCacheKey({ q, genre, mood });
    const cached = cache.get(key);

    let payload = cached;
    if (!payload) {
      payload = await parseMovies({ query: q, genre, mood });
      cache.set(key, payload);
    }

    const total = payload.movies.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const results = payload.movies.slice(start, end);

    res.json({
      query: { q, genre, mood },
      page,
      perPage,
      total,
      hasMore: end < total,
      cached: Boolean(cached),
      sourceStatus: payload.sourceStatus,
      results
    });
  } catch (error) {
    next(error);
  }
});

export { router as searchRouter };

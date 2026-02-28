const axios = require('axios');
const cheerio = require('cheerio');
const { assignMoods, getGenresForMood } = require('./mood-mapper');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const TIMEOUT = 15000;
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function fetchHTML(url) {
  const cached = getCached(url);
  if (cached) return cached;
  const res = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
  setCache(url, res.data);
  return res.data;
}

// ── IMDb genre slug mapping ───────────────────────────────────────────────────
const IMDB_GENRE_MAP = {
  comedy:      'comedy',
  drama:       'drama',
  action:      'action',
  horror:      'horror',
  'sci-fi':    'sci_fi',
  romance:     'romance',
  thriller:    'thriller',
  animation:   'animation',
  documentary: 'documentary',
  adventure:   'adventure',
  fantasy:     'fantasy',
  crime:       'crime',
  mystery:     'mystery',
  biography:   'biography',
  history:     'history',
  musical:     'musical',
  western:     'western',
  sport:       'sport',
  family:      'family',
};

// ── Upgrade IMDb thumbnail to larger poster ───────────────────────────────────
function upgradePosterUrl(src) {
  if (!src) return null;
  // Replace small thumbnail params with larger ones
  return src.replace(/_V1_QL75_UX\d+_CR[\d,]+_\.jpg/, '_V1_QL75_UX400_CR0,0,400,592_.jpg')
            .replace(/_V1_UX\d+_CR[\d,]+_\.jpg/, '_V1_UX400_CR0,0,400,592_.jpg')
            .replace(/\._V1_\..+\.jpg/, '._V1_QL75_UX400_CR0,0,400,592_.jpg');
}

// ── Parse IMDb search results page ───────────────────────────────────────────
function parseIMDbResults($, searchedGenre) {
  const movies = [];

  $('li.ipc-metadata-list-summary-item').each((_, item) => {
    const el = $(item);

    // Title (strip numbering like "1. ")
    const titleRaw = el.find('h3.ipc-title__text').text().trim();
    const title = titleRaw.replace(/^\d+\.\s*/, '').trim();
    if (!title) return;

    // Link to IMDb movie page
    const href = el.find('a.ipc-title-link-wrapper').attr('href') || '';
    const link = href ? `https://www.imdb.com${href.split('?')[0]}` : null;

    // Poster image
    const posterSrc = el.find('img.ipc-image').attr('src') || '';
    const poster = posterSrc ? upgradePosterUrl(posterSrc) : null;

    // Metadata: year, runtime, certificate
    const metaItems = el.find('.dli-title-metadata-item')
      .map((_, e) => $(e).text().trim()).get();
    const year = metaItems[0] ? parseInt(metaItems[0]) || null : null;

    // IMDb rating from aria-label
    const ratingLabel = el.find('[data-testid="ratingGroup--imdb-rating"]').attr('aria-label') || '';
    const ratingMatch = ratingLabel.match(/(\d+\.?\d*)/);
    const rating = ratingMatch ? ratingMatch[1] : null;

    // Description - the plot text is embedded in the li text
    // It appears after the metadata and rating section
    const fullText = el.text().replace(/\s+/g, ' ').trim();
    let description = '';
    // Try to isolate the plot: it comes after the vote count pattern
    const descMatch = fullText.match(/\(\d[\d,.]+[KMB]?\)\s*Rate.*?watched(.*?)(?:Add to|$)/);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    } else {
      // Fallback: find the plot via a known pattern
      const plotEl = el.find('[class*="plot"], [data-testid="plot-xl"], [class*="Plot"]');
      description = plotEl.text().trim();
    }
    // Another approach: look at all text nodes excluding structured data
    if (!description) {
      const liText = el.clone();
      liText.find('script, style').remove();
      const rawText = liText.text().replace(/\s+/g, ' ').trim();
      // Plot is usually the last meaningful sentence
      const parts = rawText.split(/Rate|Mark as watched/);
      if (parts.length > 1) {
        description = parts[parts.length - 1].trim().slice(0, 300);
      }
    }

    movies.push({
      title,
      year,
      poster,
      genres: searchedGenre ? [searchedGenre] : [],
      rating,
      description: description.slice(0, 300),
      source: 'IMDb',
      link,
    });
  });

  return movies;
}

// ── Scrape IMDb by genre ──────────────────────────────────────────────────────
async function scrapeIMDbByGenre(genre, sortBy = 'num_votes') {
  const genreSlug = IMDB_GENRE_MAP[genre.toLowerCase()] || genre.toLowerCase().replace(/[\s-]/g, '_');
  const url = `https://www.imdb.com/search/title/?genres=${genreSlug}&sort=${sortBy},desc&title_type=feature&count=40`;

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    return parseIMDbResults($, genre);
  } catch (e) {
    console.error(`IMDb genre scrape failed for "${genre}":`, e.message);
    return [];
  }
}

// ── Scrape IMDb by title query ────────────────────────────────────────────────
async function scrapeIMDbByTitle(query, genre = '') {
  const params = new URLSearchParams({ title: query, title_type: 'feature', count: '30' });
  if (genre) {
    const genreSlug = IMDB_GENRE_MAP[genre.toLowerCase()] || genre.toLowerCase();
    params.set('genres', genreSlug);
  }
  const url = `https://www.imdb.com/search/title/?${params.toString()}&sort=num_votes,desc`;

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);
    return parseIMDbResults($, genre || null);
  } catch (e) {
    console.error('IMDb title search failed:', e.message);
    return [];
  }
}

// ── DuckDuckGo Lite (POST) for broad text queries ─────────────────────────────
async function scrapeDuckDuckGo(query) {
  const url = 'https://lite.duckduckgo.com/lite/';
  try {
    const res = await axios.post(url, `q=${encodeURIComponent(query + ' film')}`, {
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://lite.duckduckgo.com/',
      },
      timeout: TIMEOUT,
    });
    const $ = cheerio.load(res.data);
    const movies = [];

    $('tr').each((_, row) => {
      const link = $(row).find('a.result-link');
      if (!link.length) return;
      const title = link.text().trim();
      const href = link.attr('href');
      const snippet = $(row).nextAll('tr').first().find('.result-snippet').text().trim();
      if (!title) return;

      const yearMatch = (title + ' ' + snippet).match(/\b(19|20)\d{2}\b/);
      movies.push({
        title: cleanDDGTitle(title),
        year: yearMatch ? parseInt(yearMatch[0]) : null,
        description: snippet.slice(0, 250),
        genres: [],
        poster: null,
        rating: null,
        source: 'Web',
        link: href || null,
      });
    });

    return movies.slice(0, 12);
  } catch (e) {
    console.error('DDG scrape failed:', e.message);
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cleanDDGTitle(raw) {
  return raw
    .replace(/\s*-\s*(IMDb|Rotten Tomatoes|Wikipedia|Metacritic|TMDB|Letterboxd|Collider|.{1,30})$/, '')
    .replace(/\s*\|\s*.+$/, '')
    .replace(/\s*(Top|Best|New|Most)\s+\d+.*$/i, '')
    .replace(/\s*\(\d{4}\)$/, '')
    .trim();
}

function deduplicateMovies(movies) {
  const seen = new Map();
  for (const m of movies) {
    const key = (m.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, { ...m });
    } else {
      const existing = seen.get(key);
      if (!existing.poster && m.poster) existing.poster = m.poster;
      if (!existing.year && m.year) existing.year = m.year;
      if (!existing.description && m.description) existing.description = m.description;
      if (!existing.rating && m.rating) existing.rating = m.rating;
      if (m.genres.length > existing.genres.length) existing.genres = m.genres;
    }
  }
  return [...seen.values()];
}

function isValidMovie(movie) {
  if (!movie.title || movie.title.length < 2) return false;
  const lower = movie.title.toLowerCase();
  const skip = ['top ', 'best ', 'list of', 'new ', 'movies of', 'films of', 'ranked', 'picks'];
  return !skip.some(s => lower.startsWith(s));
}

// ── Main search function ──────────────────────────────────────────────────────
async function searchMovies({ query = '', genre = '', mood = '' }) {
  const tasks = [];
  const resolvedGenres = [];

  // Determine genres to search
  if (genre) resolvedGenres.push(genre.toLowerCase());
  if (mood && !genre) {
    const moodGenres = getGenresForMood(mood);
    resolvedGenres.push(...moodGenres.slice(0, 2));
  }

  // IMDb scraping tasks
  if (resolvedGenres.length > 0) {
    for (const g of resolvedGenres) {
      tasks.push(scrapeIMDbByGenre(g));
    }
  }

  if (query) {
    // Text search on IMDb (optionally filtered by genre)
    tasks.push(scrapeIMDbByTitle(query, resolvedGenres[0] || ''));
    // Also DuckDuckGo for broader coverage
    const ddgQuery = [query, genre, mood].filter(Boolean).join(' ') + ' movie';
    tasks.push(scrapeDuckDuckGo(ddgQuery));
  } else if (resolvedGenres.length === 0) {
    // Fallback: popular movies
    tasks.push(scrapeIMDbByGenre('drama'));
    tasks.push(scrapeIMDbByGenre('comedy'));
  }

  // Run all scrapers in parallel with individual error handling
  const results = await Promise.allSettled(tasks);
  let rawMovies = [];
  for (const r of results) {
    if (r.status === 'fulfilled') rawMovies.push(...r.value);
  }

  // Filter noise
  rawMovies = rawMovies.filter(isValidMovie);

  // Deduplicate
  let movies = deduplicateMovies(rawMovies);

  // Assign moods to each movie
  movies = movies.map(m => ({ ...m, moods: assignMoods(m) }));

  // Filter by mood if specified
  if (mood) {
    const moodLower = mood.toLowerCase();
    const withMood = movies.filter(m => m.moods.some(x => x.toLowerCase() === moodLower));
    const without = movies.filter(m => !m.moods.some(x => x.toLowerCase() === moodLower));
    // Put matching moods first, rest after
    movies = [...withMood, ...without];
  }

  // If text query, prioritize title matches
  if (query) {
    const q = query.toLowerCase();
    movies.sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(q) ? 0 : 1;
      const bMatch = b.title.toLowerCase().includes(q) ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  return movies.slice(0, 36);
}

module.exports = { searchMovies };

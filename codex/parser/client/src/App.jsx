import { useEffect, useMemo, useState, useTransition } from "react";
import FilterTabs from "./components/FilterTabs.jsx";
import MovieCard from "./components/MovieCard.jsx";
import MovieModal from "./components/MovieModal.jsx";
import SearchBar from "./components/SearchBar.jsx";
import SkeletonGrid from "./components/SkeletonGrid.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { searchMovies } from "./api.js";
import { GENRES, MOODS, TRENDING_QUERIES } from "./constants.js";

const RECENT_MOODS_KEY = "moodflix-recent-moods-v1";

function readRecentMoods() {
  try {
    const value = localStorage.getItem(RECENT_MOODS_KEY);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
  } catch {
    return [];
  }
}

function App() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recentMoods, setRecentMoods] = useState(readRecentMoods);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("moodflix-theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("moodflix-theme", theme);
  }, [theme]);

  const activeFilters = useMemo(() => [genre, mood].filter(Boolean), [genre, mood]);

  async function runSearch(nextPage, append = false) {
    setError("");
    setIsLoading(true);

    try {
      const payload = await searchMovies({
        query,
        genre,
        mood,
        page: nextPage,
        perPage: 16
      });

      startTransition(() => {
        setMovies((prev) => (append ? [...prev, ...payload.results] : payload.results));
        setPage(payload.page);
        setHasMore(payload.hasMore);
        setTotal(payload.total);
      });

      if (mood) {
        const nextRecent = [mood, ...recentMoods.filter((value) => value !== mood)].slice(0, 4);
        setRecentMoods(nextRecent);
        localStorage.setItem(RECENT_MOODS_KEY, JSON.stringify(nextRecent));
      }
    } catch (searchError) {
      setError(searchError.message);
      if (!append) {
        setMovies([]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch() {
    runSearch(1, false);
  }

  function loadMore() {
    runSearch(page + 1, true);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">MF</span>
          <div>
            <h1>MoodFlix</h1>
            <p>Live movie discovery parser</p>
          </div>
        </div>

        <nav className="top-nav">
          <a href="#discover">Discover</a>
          <a href="#results">Results</a>
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
        </nav>
      </header>

      <main>
        <section className="hero" id="discover">
          <p className="eyebrow">No APIs. Parsed live from the open web.</p>
          <h2>Search cinema by feeling and genre.</h2>
          <SearchBar query={query} onQueryChange={setQuery} onSearch={handleSearch} />

          <div className="trending-row" aria-label="Trending suggestions">
            {TRENDING_QUERIES.map((item) => (
              <button key={item} type="button" className="trending-chip" onClick={() => setQuery(item)}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="filters-panel">
          <FilterTabs label="Genre" options={GENRES} selected={genre} onChange={setGenre} />
          <FilterTabs label="Mood" options={MOODS} selected={mood} onChange={setMood} />

          {recentMoods.length > 0 && (
            <div className="recent-row">
              <p>Recent moods:</p>
              {recentMoods.map((recent) => (
                <button key={recent} type="button" className="recent-chip" onClick={() => setMood(recent)}>
                  {recent}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="results-panel" id="results">
          <div className="results-header">
            <h3>Results</h3>
            <p>
              {total} movie{total === 1 ? "" : "s"} found
              {activeFilters.length > 0 ? ` • ${activeFilters.join(" + ")}` : ""}
            </p>
          </div>

          {error && <p className="status error">{error}</p>}
          {!error && isLoading && movies.length === 0 && <SkeletonGrid count={8} />}

          {!error && movies.length > 0 && (
            <div className="movie-grid">
              {movies.map((movie) => (
                <MovieCard key={`${movie.title}-${movie.year}-${movie.link}`} movie={movie} onSelect={setSelectedMovie} />
              ))}
            </div>
          )}

          {!isLoading && !error && movies.length === 0 && (
            <p className="status">No movies yet. Run a search to parse live results.</p>
          )}

          {hasMore && !isLoading && (
            <button type="button" className="load-more" onClick={loadMore}>
              Load more
            </button>
          )}

          {(isLoading || isPending) && movies.length > 0 && <p className="status">Loading more titles...</p>}
        </section>
      </main>

      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
    </div>
  );
}

export default App;

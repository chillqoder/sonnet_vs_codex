function SearchBar({ query, onQueryChange, onSearch }) {
  return (
    <section className="search-shell">
      <div className="search-row">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find a movie for your mood..."
          className="search-input"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSearch();
            }
          }}
        />
        <button type="button" className="search-button" onClick={onSearch}>
          Search
        </button>
      </div>
    </section>
  );
}

export default SearchBar;

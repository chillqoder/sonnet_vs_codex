function MovieModal({ movie, onClose }) {
  if (!movie) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="movie-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${movie.title} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="close-button" onClick={onClose} type="button" aria-label="Close details">
          ✕
        </button>

        <div className="modal-grid">
          <div className="modal-poster-wrap">
            {movie.poster ? (
              <img className="modal-poster" src={movie.poster} alt={`${movie.title} poster`} />
            ) : (
              <div className="modal-poster placeholder">No Poster</div>
            )}
          </div>

          <div className="modal-content">
            <h2>{movie.title}</h2>
            <p className="modal-meta">
              {movie.year ?? "Unknown year"} • Rating: {movie.rating}
            </p>

            <p className="modal-description">
              {movie.description || "No description available from this source."}
            </p>

            <div className="modal-tags">
              {movie.genres.map((genre) => (
                <span key={genre} className="tag genre">
                  {genre}
                </span>
              ))}
              {movie.moods.map((mood) => (
                <span key={mood} className="tag mood">
                  {mood}
                </span>
              ))}
            </div>

            <a className="external-link" href={movie.link} target="_blank" rel="noreferrer">
              Open source page
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MovieModal;

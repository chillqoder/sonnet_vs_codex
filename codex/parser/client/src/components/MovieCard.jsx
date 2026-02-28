import { memo } from "react";

function MovieCard({ movie, onSelect }) {
  return (
    <article className="movie-card" onClick={() => onSelect(movie)}>
      <div className="movie-poster-wrap">
        {movie.poster ? (
          <img className="movie-poster" src={movie.poster} alt={`${movie.title} poster`} loading="lazy" />
        ) : (
          <div className="movie-poster placeholder">No Poster</div>
        )}
        <span className="rating-badge">{movie.rating}</span>
      </div>

      <div className="movie-content">
        <h3>{movie.title}</h3>
        <p className="movie-meta">
          <span>{movie.year ?? "Unknown year"}</span>
          <span>{movie.source}</span>
        </p>

        <div className="tag-row">
          {movie.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="tag genre">
              {genre}
            </span>
          ))}
          {movie.moods.slice(0, 2).map((mood) => (
            <span key={mood} className="tag mood">
              {mood}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default memo(MovieCard);

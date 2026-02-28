export async function searchMovies({ query, genre, mood, page = 1, perPage = 16 }) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query.trim());
  }
  if (genre) {
    params.set("genre", genre);
  }
  if (mood) {
    params.set("mood", mood);
  }

  params.set("page", String(page));
  params.set("perPage", String(perPage));

  const response = await fetch(`/api/search?${params.toString()}`);

  if (!response.ok) {
    const message = `Search failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

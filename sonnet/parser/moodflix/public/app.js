// ── State ──────────────────────────────────────────────────────────────────────
const state = {
  query: '',
  genre: '',
  mood: '',
  movies: [],
  loading: false,
};

// ── DOM Refs ───────────────────────────────────────────────────────────────────
const searchInput    = document.getElementById('search-input');
const searchBtn      = document.getElementById('search-btn');
const movieGrid      = document.getElementById('movie-grid');
const resultsSection = document.getElementById('results-section');
const skeletonSection= document.getElementById('skeleton-section');
const skeletonGrid   = document.getElementById('skeleton-grid');
const resultsTitle   = document.getElementById('results-title');
const resultsCount   = document.getElementById('results-count');
const noResults      = document.getElementById('no-results');
const errorBanner    = document.getElementById('error-banner');
const errorMsg       = document.getElementById('error-msg');
const modalOverlay   = document.getElementById('modal-overlay');
const modalInner     = document.getElementById('modal-inner');
const modalClose     = document.getElementById('modal-close');
const genreTabs      = document.getElementById('genre-tabs');
const moodTabs       = document.getElementById('mood-tabs');

// ── Filter Tabs ────────────────────────────────────────────────────────────────
function setupTabs(container, stateKey) {
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state[stateKey] = btn.dataset.value;
    });
  });
  // Mark first as active
  const first = container.querySelector('.tab-btn');
  if (first) first.classList.add('active');
}

setupTabs(genreTabs, 'genre');
setupTabs(moodTabs, 'mood');

// ── Search ─────────────────────────────────────────────────────────────────────
async function doSearch() {
  const query = searchInput.value.trim();
  const { genre, mood } = state;

  if (!query && !genre && !mood) {
    showError('Enter a search term or choose a genre / mood.');
    return;
  }

  state.query = query;
  state.loading = true;
  showSkeleton(12);
  hideError();

  try {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (genre) params.set('genre', genre);
    if (mood)  params.set('mood', mood);

    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Search failed');

    const data = await res.json();
    state.movies = data.movies || [];
    renderResults();
  } catch (err) {
    hideSkeleton();
    showError(err.message || 'Search failed. Check your connection.');
  } finally {
    state.loading = false;
  }
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// ── Render Results ─────────────────────────────────────────────────────────────
function renderResults() {
  hideSkeleton();
  resultsSection.style.display = 'block';
  movieGrid.innerHTML = '';

  const { movies, genre, mood, query } = state;
  const parts = [query, genre, mood].filter(Boolean).join(' · ');
  resultsTitle.textContent = parts ? `Results for "${parts}"` : 'Results';
  resultsCount.textContent = movies.length ? `${movies.length} movies found` : '';

  if (!movies.length) {
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  movies.forEach((movie, i) => {
    const card = createMovieCard(movie);
    card.style.animationDelay = `${i * 40}ms`;
    card.classList.add('card-appear');
    movieGrid.appendChild(card);
  });
}

// ── Movie Card ─────────────────────────────────────────────────────────────────
function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.addEventListener('click', () => openModal(movie));

  const posterHTML = movie.poster
    ? `<img class="card-poster" src="${escHtml(movie.poster)}" alt="${escHtml(movie.title)}" loading="lazy" onerror="this.replaceWith(makePlaceholderEl())">`
    : `<div class="card-poster-placeholder" style="background:${gradientFor(movie.title)}">🎬</div>`;

  const genres = (movie.genres || []).slice(0, 2)
    .map(g => `<span class="genre-tag">${escHtml(g)}</span>`).join('');

  const moods = (movie.moods || []).slice(0, 2)
    .map(m => `<span class="mood-chip">${escHtml(m)}</span>`).join('');

  const rating = movie.rating ? `<span class="rating-badge">★ ${movie.rating}</span>` : '';

  card.innerHTML = `
    ${posterHTML}
    <span class="source-label">${escHtml(movie.source || '')}</span>
    <div class="card-body">
      <div class="card-title">${escHtml(movie.title)}</div>
      <div class="card-meta">
        <span class="card-year">${movie.year || '–'}</span>
        ${rating}
      </div>
      ${genres ? `<div class="card-genres">${genres}</div>` : ''}
      ${moods  ? `<div class="mood-chips">${moods}</div>`  : ''}
    </div>
  `;
  return card;
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function openModal(movie) {
  const posterBg = movie.poster
    ? `<img class="modal-poster" src="${escHtml(movie.poster)}" alt="" loading="lazy">
       <img class="modal-poster-thumb" src="${escHtml(movie.poster)}" alt="${escHtml(movie.title)}" loading="lazy">`
    : `<div class="modal-poster-placeholder" style="background:${gradientFor(movie.title)}">🎬</div>`;

  const genres = (movie.genres || [])
    .map(g => `<span class="genre-tag">${escHtml(g)}</span>`).join('');

  const moods = (movie.moods || [])
    .map(m => `<span class="mood-chip">${escHtml(m)}</span>`).join('');

  const rating = movie.rating ? `<span class="modal-rating">★ ${movie.rating}</span>` : '';

  const director = movie.director ? `Directed by ${escHtml(movie.director)}` : '';

  const linkHTML = movie.link
    ? `<a class="modal-link" href="${escHtml(movie.link)}" target="_blank" rel="noopener noreferrer">
        View Source ↗
       </a>`
    : '';

  modalInner.innerHTML = `
    <div class="modal-poster-wrap">${posterBg}</div>
    <div class="modal-body">
      <div class="modal-title">${escHtml(movie.title)}</div>
      <div class="modal-meta">
        ${movie.year ? `<span>${movie.year}</span>` : ''}
        ${rating}
        ${director ? `<span>${director}</span>` : ''}
        ${movie.source ? `<span style="color:var(--text-muted);font-size:.78rem">via ${escHtml(movie.source)}</span>` : ''}
      </div>
      ${movie.description ? `<p class="modal-description">${escHtml(movie.description)}</p>` : ''}
      ${genres ? `<div class="modal-genres">${genres}</div>` : ''}
      ${moods  ? `<div class="modal-moods">${moods}</div>`  : ''}
      ${linkHTML}
    </div>
  `;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Skeleton Loader ────────────────────────────────────────────────────────────
function showSkeleton(n = 12) {
  skeletonGrid.innerHTML = Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-poster"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
  `).join('');
  skeletonSection.style.display = 'block';
  resultsSection.style.display = 'none';
}

function hideSkeleton() {
  skeletonSection.style.display = 'none';
}

// ── Error Banner ───────────────────────────────────────────────────────────────
let errorTimer = null;
function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.style.display = 'flex';
  clearTimeout(errorTimer);
  errorTimer = setTimeout(hideError, 5000);
}
function hideError() { errorBanner.style.display = 'none'; }

// ── Helpers ────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function gradientFor(title) {
  // Deterministic gradient based on title chars
  const n = [...(title || '🎬')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = n % 360;
  return `linear-gradient(135deg, hsl(${hue},50%,15%), hsl(${(hue+60)%360},60%,25%))`;
}

// Fallback element when img fails to load
function makePlaceholderEl() {
  const d = document.createElement('div');
  d.className = 'card-poster-placeholder';
  d.textContent = '🎬';
  return d;
}

// Add card-appear CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes cardAppear {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .card-appear { animation: cardAppear .4s ease both; }
`;
document.head.appendChild(style);

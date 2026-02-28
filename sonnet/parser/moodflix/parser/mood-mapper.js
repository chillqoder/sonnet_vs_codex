// Genre → Mood mapping
const GENRE_MOOD_MAP = {
  comedy:          ['happy', 'cozy', 'relaxed'],
  drama:           ['emotional', 'thoughtful'],
  horror:          ['dark'],
  thriller:        ['dark'],
  mystery:         ['dark', 'thoughtful'],
  crime:           ['dark', 'thoughtful'],
  romance:         ['romantic', 'cozy'],
  'romantic comedy': ['romantic', 'happy'],
  action:          ['adventurous', 'excited'],
  adventure:       ['adventurous', 'excited'],
  fantasy:         ['adventurous', 'cozy'],
  'sci-fi':        ['thoughtful', 'adventurous'],
  'science fiction': ['thoughtful', 'adventurous'],
  animation:       ['happy', 'cozy'],
  family:          ['happy', 'cozy'],
  documentary:     ['thoughtful', 'inspirational'],
  biography:       ['inspirational', 'thoughtful'],
  historical:      ['thoughtful', 'inspirational'],
  musical:         ['happy', 'romantic'],
  war:             ['dark', 'thoughtful'],
  western:         ['adventurous'],
  sport:           ['inspirational', 'excited'],
};

// Mood → Genre mapping (for constructing queries)
const MOOD_GENRE_MAP = {
  happy:         ['comedy', 'animation', 'family', 'musical'],
  cozy:          ['comedy', 'animation', 'romance', 'family'],
  romantic:      ['romance', 'drama', 'musical'],
  emotional:     ['drama'],
  thoughtful:    ['drama', 'documentary', 'sci-fi', 'mystery'],
  dark:          ['horror', 'thriller', 'mystery', 'crime'],
  inspirational: ['documentary', 'drama', 'biography', 'sport'],
  adventurous:   ['action', 'adventure', 'fantasy', 'western'],
  excited:       ['action', 'thriller', 'adventure'],
  relaxed:       ['comedy', 'animation', 'romance'],
};

// Keyword → Mood signals in descriptions
const KEYWORD_MOOD_MAP = {
  dark:          ['murder', 'death', 'evil', 'terror', 'horror', 'violence', 'killer', 'dark', 'grim', 'nightmare'],
  happy:         ['funny', 'laugh', 'comedy', 'joy', 'celebrate', 'cheerful', 'hilarious', 'lighthearted'],
  romantic:      ['love', 'romance', 'heart', 'passion', 'relationship', 'couple', 'kiss', 'beloved'],
  emotional:     ['grief', 'loss', 'tears', 'sorrow', 'emotional', 'heartbreak', 'tragedy', 'drama'],
  adventurous:   ['quest', 'journey', 'explore', 'adventure', 'discover', 'escape', 'mission', 'expedition'],
  thoughtful:    ['philosophy', 'moral', 'society', 'identity', 'existential', 'psychological', 'complex'],
  inspirational: ['overcome', 'inspire', 'true story', 'triumph', 'courage', 'hope', 'dream', 'achieve'],
  cozy:          ['family', 'holiday', 'warm', 'cozy', 'home', 'heartwarming', 'gentle'],
  excited:       ['action', 'thrill', 'explosion', 'chase', 'spy', 'heist', 'intense'],
  relaxed:       ['calm', 'peaceful', 'quiet', 'gentle', 'slow', 'slice of life'],
};

function getMoodsForGenres(genres) {
  const moods = new Set();
  for (const genre of genres) {
    const normalized = genre.toLowerCase().trim();
    const mapped = GENRE_MOOD_MAP[normalized];
    if (mapped) mapped.forEach(m => moods.add(m));
  }
  return [...moods];
}

function inferMoodsFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const scores = {};
  for (const [mood, keywords] of Object.entries(KEYWORD_MOOD_MAP)) {
    scores[mood] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[mood]++;
    }
  }
  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood]) => mood);
}

function getGenresForMood(mood) {
  return MOOD_GENRE_MAP[mood.toLowerCase()] || [];
}

function assignMoods(movie) {
  const fromGenres = getMoodsForGenres(movie.genres || []);
  const fromText = inferMoodsFromText(movie.description);
  const combined = [...new Set([...fromGenres, ...fromText])];
  return combined.slice(0, 4);
}

module.exports = { getMoodsForGenres, inferMoodsFromText, getGenresForMood, assignMoods };

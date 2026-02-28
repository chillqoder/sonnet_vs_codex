const MOOD_LABELS = [
  "Happy",
  "Relaxed",
  "Romantic",
  "Thoughtful",
  "Dark",
  "Inspirational",
  "Adventurous",
  "Emotional",
  "Cozy",
  "Excited",
  "Tense"
];

const GENRE_TO_MOOD = {
  comedy: ["Happy", "Cozy"],
  drama: ["Emotional", "Thoughtful"],
  horror: ["Dark", "Tense"],
  romance: ["Romantic", "Cozy"],
  adventure: ["Adventurous", "Excited"],
  action: ["Excited", "Adventurous"],
  thriller: ["Dark", "Tense"],
  animation: ["Happy", "Cozy"],
  documentary: ["Thoughtful", "Inspirational"],
  "science fiction": ["Thoughtful", "Adventurous"],
  fantasy: ["Adventurous", "Cozy"],
  mystery: ["Thoughtful", "Dark"],
  family: ["Happy", "Cozy"],
  crime: ["Dark", "Thoughtful"],
  war: ["Thoughtful", "Emotional"]
};

const KEYWORD_TO_MOOD = {
  uplifting: ["Inspirational", "Happy"],
  hopeful: ["Inspirational", "Relaxed"],
  heartbreaking: ["Emotional"],
  intense: ["Excited", "Tense"],
  suspense: ["Tense", "Dark"],
  warm: ["Cozy", "Relaxed"],
  tender: ["Romantic", "Emotional"],
  inspiring: ["Inspirational"],
  adventure: ["Adventurous", "Excited"],
  dark: ["Dark"],
  funny: ["Happy"],
  emotional: ["Emotional", "Thoughtful"]
};

function normalizeMoodLabel(mood) {
  const maybe = MOOD_LABELS.find((item) => item.toLowerCase() === String(mood).toLowerCase());
  return maybe ?? null;
}

export function inferMoods({ genres = [], text = "", hints = [] }) {
  const moodSet = new Set();

  for (const genre of genres) {
    const key = String(genre).toLowerCase();
    const mapped = GENRE_TO_MOOD[key] ?? [];
    mapped.forEach((mood) => moodSet.add(mood));
  }

  const lowered = text.toLowerCase();
  for (const [keyword, moods] of Object.entries(KEYWORD_TO_MOOD)) {
    if (lowered.includes(keyword)) {
      moods.forEach((mood) => moodSet.add(mood));
    }
  }

  for (const hint of hints) {
    const normalized = normalizeMoodLabel(hint);
    if (normalized) {
      moodSet.add(normalized);
    }
  }

  if (moodSet.size === 0) {
    moodSet.add("Thoughtful");
  }

  return Array.from(moodSet);
}

export function normalizeMoodFilter(mood) {
  return normalizeMoodLabel(mood) ?? "";
}

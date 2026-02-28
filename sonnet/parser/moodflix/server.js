const express = require('express');
const cors = require('cors');
const path = require('path');
const { searchMovies } = require('./parser/scraper');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Search endpoint
app.get('/api/search', async (req, res) => {
  const { query = '', genre = '', mood = '' } = req.query;

  if (!query && !genre && !mood) {
    return res.status(400).json({ error: 'Provide at least one of: query, genre, mood' });
  }

  try {
    const movies = await searchMovies({ query, genre, mood });
    res.json({ movies, count: movies.length });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Serve index for all other routes (SPA fallback)
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎬 MoodFlix running at http://localhost:${PORT}\n`);
});

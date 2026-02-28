# MoodFlix

MoodFlix is a movie discovery app that scrapes publicly available movie pages at search time.

## Features

- Search by free text
- Genre + mood filters
- Dynamic parsing from multiple sources (IMDb and TMDB HTML pages)
- Deduplication and normalization of movie records
- Mood inference from genres and description keywords
- Modern streaming-inspired UI with theme toggle
- Skeleton loading, pagination, and modal details view

## Structure

- `client`: React + Vite frontend
- `server`: Express backend with scraping parser engine

## Requirements

- Node.js 20+
- npm 10+

## Run

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API

`GET /api/search?q=&genre=&mood=&page=&perPage=`

Example:

```bash
curl "http://localhost:4000/api/search?q=space&genre=Sci-Fi&mood=Thoughtful"
```

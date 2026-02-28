```md
# 🎬 Project: MoodFlix — AI-Generated Movie Discovery Parser (No API)

## Project Overview

**MoodFlix** is a modern web application built using vibe-coding principles where an AI system generates the full project autonomously.

The application allows users to discover movies based on:

- 🔎 Search query
- 🎭 Genre (Comedy, Drama, Thriller, etc.)
- 😊 Mood (Happy, Sad, Cozy, Excited, Dark, Romantic, etc.)

⚠️ **Critical Constraint:**  
The application **MUST NOT use any official APIs** or paid services.  
All movie data must be dynamically obtained via **live web parsing/scraping at search time**.

The system should independently discover movie data from publicly accessible web pages.

---

## Core Concept

Users open the website and see:

- A search bar
- Mood filters
- Genre filters
- Movie cards populated dynamically after search

Movies are **NOT pre-stored**.  
Data is gathered **on demand** when the user presses Search.

---

## Functional Requirements

### 1. Main Page Layout

The homepage must contain:

#### Header
- Project logo: **MoodFlix**
- Minimal modern navigation
- Dark/light adaptive theme

#### Search Section
- Large centered search input
- Placeholder:
```

Find a movie for your mood...

````

#### Filters

Users can combine filters:

##### 🎭 Genre Tabs
Examples:
- Comedy
- Drama
- Action
- Horror
- Sci-Fi
- Romance
- Thriller
- Animation
- Documentary

##### 😊 Mood Tabs
Examples:
- Happy
- Relaxed
- Romantic
- Thoughtful
- Dark
- Inspirational
- Adventurous
- Emotional
- Cozy

Users may select:
- only genre
- only mood
- both simultaneously
- or just search text

---

### 2. Search Behavior (IMPORTANT)

When user presses **Search**:

1. Application constructs search queries dynamically.
2. System performs web requests to public movie listing pages.
3. HTML content is fetched and parsed.
4. Relevant movies are extracted.
5. Results are normalized into a unified format.
6. Movie cards are rendered.

NO APIs allowed.

---

## Allowed Data Sources (Generic Strategy)

AI must implement scraping logic using public HTML pages such as:

- movie catalog websites
- public film listing pages
- cinema aggregators
- open web search result pages

Rules:

- Only publicly accessible HTML
- No authentication bypass
- No API endpoints
- No hidden/private data extraction

Parsing must rely on:

- HTML structure
- semantic tags
- metadata
- open structured markup (JSON-LD if present)

---

## Movie Data Model

Each movie card must contain:

```json
{
"title": "Movie title",
"year": 2023,
"poster": "image_url",
"genres": ["Drama", "Romance"],
"rating": "7.8",
"description": "Short synopsis",
"source": "parsed website name",
"link": "original movie page"
}
````

---

## Parsing Engine Requirements

The parser must:

* Work dynamically at runtime
* Support multiple sources
* Merge duplicate movies
* Handle missing data gracefully
* Normalize genres and moods

### Mood Detection Logic

If mood is not explicitly available:

AI must infer mood from:

* genres
* keywords
* descriptions

Example mapping:

| Genre     | Mood Mapping          |
| --------- | --------------------- |
| Comedy    | Happy, Cozy           |
| Drama     | Emotional, Thoughtful |
| Horror    | Dark, Tense           |
| Romance   | Romantic              |
| Adventure | Excited, Adventurous  |

---

## UI Requirements

### Design Style

* Ultra-modern streaming platform aesthetic
* Inspired by premium media platforms
* Clean typography
* Soft shadows
* Glassmorphism or subtle depth
* Smooth hover animations

### Color System

AI chooses palette automatically but must follow:

* Primary dark background
* Accent gradient color
* High readability
* Cinematic atmosphere

---

## Movie Card Design

Each card includes:

* Poster image
* Title
* Year
* Rating badge
* Genre tags
* Mood indicators
* Hover animation
* Click → opens modal with details

---

## Movie Details Modal

Contains:

* Large poster
* Description
* Genres
* Mood classification
* External link to source
* Smooth animation

---

## Technical Architecture (AI decides implementation)

AI must autonomously select technologies.

Recommended direction:

### Frontend

* Modern reactive framework
* Component-based architecture
* Client-side state management

### Backend (Required)

Because scraping cannot safely occur in browser:

* Server layer for parsing
* Request proxy
* HTML fetching
* Parsing logic

### Parsing Tools

Examples AI may choose:

* DOM parsing libraries
* headless browser (if needed)
* HTML selectors
* structured data extraction

---

## Performance Requirements

* Lazy loading results
* Skeleton loaders while parsing
* Request caching (short-term)
* Deduplication of results
* Timeout handling

---

## UX Behavior

* Search feels instant
* Loading animations while scraping
* Graceful fallback if sources fail
* Inform user when few results found

---

## Additional Smart Features (Optional but Encouraged)

* Infinite scroll
* Trending suggestions
* Recently searched moods
* Smart autocomplete
* Local cache of previous searches

---

## Folder Structure (Suggested)

```
/moodflix
  /client
  /server
  /parser
  /components
  /styles
  /utils
```

---

## Constraints Summary

✅ Parse data dynamically
✅ No APIs
✅ No static movie database
✅ Modern UI
✅ Mood + Genre filtering
✅ Real-time search parsing

❌ No official movie APIs
❌ No paid services
❌ No preloaded datasets

---

## Final Goal

Create a fully functional AI-generated web application that feels like a modern streaming discovery platform where movies are discovered live from the open web based on **user mood and genre**, without relying on any API infrastructure.

The AI must independently design, implement, and optimize all parts of the system.

```
```

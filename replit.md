# VibeScroll

A mobile-style vertical music discovery web app (Resso/TikTok-inspired) with an AI-driven infinite vertical feed, mood-based discovery, animated lyrics, social actions, and a full-stack backend.

## Architecture

**Stack**: React + TypeScript (frontend), Express + TypeScript (backend), PostgreSQL + Drizzle ORM (database)

**Design**: "Dark Future" aesthetic — dark background (240 10% 4%), primary purple (280 80% 60%), accent pink (330 80% 60%), Outfit + Space Grotesk fonts, glassmorphism cards.

### Key Directories

```
client/src/
  pages/         – Feed, Discover, Moments, Profile, ArtistDashboard
  components/    – Feed/SongCard (main feed card), Navigation
  lib/           – api.ts, recommendation.ts, tracking.ts, dummyData.ts

server/
  index.ts       – Express server entry
  routes.ts      – REST API routes (/api/*)
  storage.ts     – Drizzle ORM database layer (IStorage interface)
  ranking.ts     – Server-side ranking engine

shared/
  schema.ts      – Drizzle schema + Zod insert schemas + TypeScript types
```

## Database (PostgreSQL)

7 tables: `users`, `songs`, `moments`, `behavior_logs`, `song_likes`, `song_saves`, `moment_likes`

Demo user: `demo-user-1` (username: `vibescroller`) — all user actions use this ID (no auth system yet).

## Recommendation / Ranking System

### Server-side ranking (`server/ranking.ts`)

Every feed request calls `GET /api/songs/ranked` which:

1. **Builds a taste profile** from the user's behavior logs:
   - Accumulates mood/genre preference weights (positive for engagement, negative for skips)
   - Tracks liked/replayed song IDs, recently-played IDs, recently-skipped IDs

2. **Scores every song** across 5 components (weights add to 100%):
   | Component | Weight | Source |
   |---|---|---|
   | Taste similarity | 30% | Mood/genre match vs accumulated preference weights |
   | Recent behavior | 25% | +liked/replayed in 48h, −skipped in 24h, −recently heard |
   | Engagement quality | 25% | Completion rate, replay rate, like rate, share rate from `features.popularity` + raw DB counts |
   | Trending score | 15% | `recent24h` velocity vs historical baseline |
   | Time-of-day bonus | 5% | Mood-hour match (night → Chill, morning → Focus, etc.) |

3. **Greedy MMR diversity pass**: iteratively selects the best remaining song, applying a sliding-window artist penalty (−30pts if same artist in last 3 songs) and mood penalty (−10pts per overlapping mood in last 4 positions). This prevents feed clumping.

4. Returns songs with `_score` and `_scoreBreakdown` fields for debugging.

### Client-side segment assembler (`client/src/lib/recommendation.ts`)

Since the server already ranks + diversifies, the client engine is a lightweight assembler:
- Maintains a `shownBaseIds` set to avoid repeating within a session
- Each scroll segment (6 cards) draws from different slices of the ranked pool:
  - Slots 1–2: top 40% (personalized)
  - Slot 3: highest trending-score song
  - Slot 4: lower 40–100% (discovery/serendipity)
  - Slot 5: top 60% (mid-tier personalized)
  - Slot 6: most recently uploaded

## API Routes

All routes under `/api`:

| Method | Route | Description |
|---|---|---|
| GET | `/api/songs` | All songs (unranked) |
| GET | `/api/songs/ranked` | Songs ranked by taste + engagement + diversity |
| GET | `/api/songs/search?q=` | Search by title/artist |
| GET | `/api/songs/mood/:mood` | Songs filtered by mood |
| POST | `/api/songs` | Upload new song |
| POST | `/api/songs/:id/share` | Increment share count |
| GET/POST/DELETE | `/api/songs/:id/like` | Get liked status / like / unlike |
| GET | `/api/user/liked-songs` | Demo user's liked songs |
| GET/POST/DELETE | `/api/songs/:id/save` | Get saved status / save / unsave |
| GET | `/api/user/saved-songs` | Demo user's saved songs |
| GET | `/api/moments` | All moments with user + song data |
| POST | `/api/moments` | Create a moment |
| POST/DELETE | `/api/moments/:id/like` | Like / unlike a moment |
| POST | `/api/behavior` | Log a listen behavior event |
| GET | `/api/behavior` | Demo user's behavior history |
| GET | `/api/user/profile` | Demo user profile |
| GET | `/api/artist/songs` | Songs uploaded by demo user |

## Navigation

5 tabs: Feed (`/`), Discover (`/search`), Moments (`/moments`), Studio (`/artist/dashboard`), Profile (`/profile`)

## Notes

- **Song ID suffixes**: The recommendation assembler appends suffixes like `-seg-r1-...` for infinite scroll uniqueness. Strip with `.split("-seg-")[0]` etc. before API calls.
- **Tailwind v4**: CSS variables in `index.css` use raw `H S% L%` format inside `@theme inline`.
- **`@keyframes equalizer`**: Defined in `client/index.html` `<style>` block for visualizer bars.
- **Seed data**: Unsplash URLs used for cover images (not local assets) since data lives in PostgreSQL.

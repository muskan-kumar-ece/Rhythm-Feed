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

### Three-stage server-side pipeline (`server/ranking.ts`)

Every feed request calls `GET /api/songs/ranked` which runs 3 explicit stages:

#### Stage 1 — Candidate Generation
Four independent pools are built and merged (songs can appear in multiple pools):

| Pool | Selection Strategy | % of Catalogue |
|---|---|---|
| `taste` | Songs with at least one mood/genre tag that has a positive preference score (best-tag match, not net sum). Falls back to top-60%-by-engagement for new users. | ~60% |
| `trending` | Highest `recent24h` engagement velocity (like rate × 40 + replay rate × 40 + comment rate × 20 + velocity bonus) | ~50% |
| `new` | Most recently uploaded songs | ~40% |
| `exploration` | Songs NOT in the taste pool — forced serendipity / discovery | remainder |

Songs in multiple pools get a **pool-consensus bonus** (+10 pts per extra pool, max +20) applied in Stage 2.

#### Stage 2 — Scoring
Each candidate is scored across 6 components:

| Component | Weight | Source |
|---|---|---|
| Engagement quality | **35%** | Completion rate, replay rate, like/share rate from `features.popularity` + raw DB counts |
| Taste similarity | **30%** | Max individual mood/genre tag score vs. preference weights (neutral 50 for new users) |
| Recent behavior | **15%** | +liked/replayed in 48h, −skipped in 24h, −recently heard |
| Recency / freshness | **10%** | Upload age decay (100 → 0 over 90 days) |
| Time-of-day bonus | **5%** | Mood-hour match (night → Chill, morning → Focus, etc.) |
| Pool consensus | **flat** | +10 pts per extra pool nomination, capped at +20 |

#### Stage 3 — Ranking & Diversity
- Initial sort by composite score (descending)
- **Greedy MMR diversity pass**: iteratively picks the best remaining song after applying sliding-window penalties:
  - −30 pts if same artist appeared in the last 3 selections
  - −10 pts per overlapping mood tag in the last 4 selections

Returns songs with `_score`, `_scoreBreakdown`, and `_pools` fields.

### Client-side segment assembler (`client/src/lib/recommendation.ts`)

Lightweight assembler that draws from the server-ranked pool:
- Maintains a `shownBaseIds` set to avoid session-level repeats
- Each 6-card scroll segment pulls from different pool slices:
  - Slots 1–2: top 40% (best personalized)
  - Slot 3: highest trending-velocity song
  - Slot 4: lower 40–100% (serendipity/discovery)
  - Slot 5: top 60% (mid-tier personalized)
  - Slot 6: most recently uploaded

## Discovery Boost System (`server/discovery.ts`)

Every newly uploaded song enters the discovery pipeline at `test` phase and advances (or is suppressed) automatically based on real engagement data.

### Distribution phases

| Phase | Score | Feed inclusion | Description |
|---|---|---|---|
| `test` | 10 | ~10% of feeds | Brand-new, shown to a small sample first |
| `growth` | 40 | ~40% of feeds | Proven early engagement; ramping up |
| `broad` | 75 | ~75% of feeds | Strong signal; near-full distribution |
| `full` | 100 | 100% of feeds | Fully distributed (default for existing catalogue) |
| `suppressed` | 3–5 | ~3–5% of feeds | Poor engagement; near-hidden but discoverable |

### Evaluation trigger
After every `POST /api/behavior` for a song not yet in `full` phase, the engine evaluates asynchronously (fire-and-forget) without blocking the API response.

Minimum 3 behavior logs are required before any decision is made.

### Tracked metrics
- **Completion rate** — fraction of listens that were not skipped
- **Skip rate** — fraction of listens skipped  
- **Avg replays** — average number of replays per listen
- **Like rate** — fraction of listens that resulted in a like
- **Avg duration** — average listen duration in seconds

### Classification thresholds
- **High engagement**: completion ≥ 55% or like rate ≥ 12% or (completion ≥ 55% + duration ≥ 20s)
- **Low engagement**: skip rate ≥ 65% with no likes or replays
- **Neutral**: everything else (gentle +5 pts nudge)

### Promotion ladder (high engagement)
- `test (≤15)` → multiply × 4, cap at 40 → `growth`
- `growth (≤50)` → multiply × 2, cap at 75 → `broad`
- `broad (≤85)` → multiply × 1.4, cap at 100 → `full`

### Suppression (low engagement)
Score × 0.4, floor at 3 → `suppressed`

### Integration with ranking (Stage 1)
The distribution gate runs before candidate generation:
1. Each song passes with probability `distributionScore / 100`
2. A minimum of 4 songs always pass (fallback: highest-scored gated songs)
3. Songs that pass get a `distributionMultiplier = (score/100)^0.6` applied to their Stage 2 score (test=0.10×, growth=0.60×, full=1.0×)

### New API endpoints
- `GET /api/songs/:id/distribution` — score, phase, totalLogs, engagement classification, raw metrics for a single song
- `GET /api/discovery/stats` — catalogue-wide overview with all songs' distribution status

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

# Rytham

A mobile-style vertical music discovery web app (Resso/TikTok-inspired) with an AI-driven infinite vertical feed, mood-based discovery, animated lyrics, social actions, Music Moments, an AI DJ, a full creator portal with track upload + moderation pipeline, and a full-stack backend.

## Architecture

**Stack**: React + TypeScript (frontend), Express + TypeScript (backend), PostgreSQL + Drizzle ORM (database)

**Design**: "Dark Future" aesthetic — dark background (240 10% 4%), primary purple (280 80% 60%), accent pink (330 80% 60%), Outfit + Space Grotesk fonts, glassmorphism cards.

### Key Directories

```
client/src/
  pages/         – Feed, Trending, Moments, Profile, ArtistPortal, AdminDashboard, Spotlight, Login, Signup, PlaylistPage, NotificationsPage, SongPage, MomentPage
  components/    – Feed/SongCard (main feed card), Navigation (with bell+badge), AuthGuard, RoleGuard
  contexts/      – AuthContext (JWT cookie auth state, includes role)
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

## Authentication & RBAC

JWT stored in httpOnly cookie `rytham_token` (7-day expiry). Payload: `{ userId, username, role }`.

**Roles** — stored in `users.role` column, defaults to `"user"`:
- `user` — normal app access (feed, profile, spotlight) → redirects to `/`
- `artist` — upload songs & spotlights → redirects to `/artist/dashboard` after login
- `admin` — full moderation access → redirects to `/admin` after login

**Role-based redirect**: `Login.tsx` and `AuthGuard.tsx` both redirect based on role after auth.
`AuthContext.login()` and `signup()` return the user object so callers can act on role immediately.

**Demo accounts** (all use password `demo1234`, no passwordHash in DB):
- `vibescroller` → role: `user`
- `demoartist` → role: `artist`
- `demoadmin` → role: `admin`

**Frontend route guards**: `RoleGuard` component in `App.tsx` wraps `/artist/*` (artist + admin) and `/admin` (admin only) routes. Navigation shows role-appropriate tabs.

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
| GET | `/api/trending/viral` | Top 10 songs by recent 24h engagement |
| GET | `/api/trending/fastest` | Top 10 fastest-growing songs (recent/total play ratio) |
| GET | `/api/trending/moments-songs` | Songs most frequently featured in Moments |
| GET | `/api/songs/:id/moments` | All Moments created for a specific song |
| POST | `/api/ai-dj/next` | Next song for Continuous DJ Mode (session-aware) |
| GET | `/api/admin/stats` | Platform-wide analytics (DAU, skip/completion rates, etc.) |
| GET | `/api/admin/daily-activity` | Daily play/skip/completion/like counts for last 14 days |
| GET | `/api/admin/retention` | User retention cohort data (Day 1 / Day 7) |

## First-Time Onboarding Flow

New users (no `vibescroll_onboarding` in localStorage) are shown a two-step preference picker before any content:

1. **Step 1 — Mood picker**: Tap to multi-select from 7 mood cards (Chill, Focus, Night Drive, Gym, Study, Sad, Hype), each with a unique color theme and emoji. Requires at least 1 selection.
2. **Step 2 — Genre picker**: Tap to multi-select from 8 genre cards (Electronic, Hip-Hop, Pop, R&B, Indie, Jazz, Lo-Fi, Rock). Requires at least 1 selection.
3. **Build animation**: "Building your vibe…" splash with animated progress bar and mood/genre tags.
4. On completion, prefs are saved to `localStorage` as `vibescroll_onboarding = { moods, genres, completedAt }`, then the AI DJ intro fires immediately with cold-start context.

The onboarding flow is implemented in `client/src/components/Onboarding.tsx`.

### Cold-Start Session Context
After onboarding, `buildColdStartContext(prefs)` creates a synthetic `SessionContext` with:
- `isColdStart: true`
- `onboardingPrefs: { genres, moods }` (stated prefs)
- `sessionLength: 5` (bypasses the "too few listens" guard in the ranking engine)

This context is passed to `GET /api/songs/ranked` so the ranking engine immediately weights songs at 55% session-context vs 20% normally. Songs matching the stated moods/genres score 72+ out of 100 vs 50 neutral.

## Retention-Optimized First Feed

### Cold-Start Feed Segment (`generateColdStartFeedSegment(prefs)`)
- Scores every song by mood+genre match against onboarding prefs (30 pts per mood match, 22 pts per genre match) plus 50% of server `_score`
- Picks artist-diverse top 5 (no same artist in first 3 slots)
- Falls back to normal feed if match pool is too small
- Appends a standard segment for infinite scroll
- Used immediately after AI DJ intro for first-time users

### Feed initialization order after onboarding
1. DJ playlist (8 songs, already preference-filtered by cold-start session context)
2. Cold-start segment (5 more matched songs from `generateColdStartFeedSegment`)
3. Normal `generateFeedSegment()` for subsequent swipes

## Aggressive Skip/Replay Learning (Within-Session)

### Negative preference tracking (in-memory, per session)
Every skip is recorded in `_negativeProfile.moods` and `_negativeProfile.genres` (module-level state in `session.ts`). These are included in `SessionContext.negativePreferences` on every ranked-songs request.

**Penalty applied per song**: −18 pts per skip for each matching mood tag, −14 pts per skip for each matching genre tag, capped at −70 pts total.

### Replay boost tracking (in-memory, per session)
Every replay increments `_replayBoosts.moods` and `_replayBoosts.genres`. Included in `SessionContext.replayBoosts`.

**Boost applied per song**: +15 pts per replay for each matching mood tag, +12 pts per replay for each matching genre tag, capped at +40 pts total.

### How fast it kicks in
- Skip 2 songs with "Sad" mood → all remaining "Sad" songs lose 36 pts (nearly disappear from feed)
- Replay 2 songs with "Focus" mood → all "Focus" songs gain 30 pts (actively promoted)
- These adjustments fire on every re-rank (every 3 swipes), so the feed adapts within the first 10 swipes

### Key: `replays` now flows through the full signal chain
`SongCard.tsx` passes `replays` count to `recordSessionPlay()` which updates `_replayBoosts` in real-time. The `SessionEntry` type now includes `replays: number`.

## AI Personal DJ System

### Server (`GET /api/ai-dj/session`)
- Analyzes the user's last 30 behavior logs to determine dominant mood (weighted: liked songs count 2×)
- Classifies time of day (morning/afternoon/evening/latenight)
- Applies a greeting template matrix (time × mood) for 16+ distinct personalized greetings
- Returns `{ greeting, theme, timeOfDay, dominantMood, topMoods, hasHistory, playlist[8] }`
- The `playlist` is the server-ranked feed filtered to prefer songs matching the primary mood

### Client (`AIDJIntro.tsx`)
- Full-screen splash that runs on the FIRST visit per browser session (`sessionStorage`)
- Phases: loading → analyzing (stepped progress bar with copy) → reveal → starting
- Reveal shows the personalized greeting, mood tags, a 5-cover playlist strip, and a "Start Session" CTA
- Auto-advances to the feed after 3 seconds; user can also tap "Start Session" immediately
- On dismiss: `Feed.tsx` sets the DJ playlist as the first page of `feedItems` and shows the greeting in the banner

## Enhanced Music Moments

### New API routes
- `GET /api/moments/trending` — moments sorted by engagement score (likes×2 + comments), limit 20
- `GET /api/moments/discover-songs` — unique songs sourced from top-engaged moments via `selectDistinctOn`
- `POST /api/moments` now fully wired with lyric picker, mood selection, and caption; invalidates cache on success

### Moments page
- **Two tabs**: "For You" (engagement-sorted) and "Trending" (ranked + flame badges)
- **Discover Songs strip**: horizontal scroll of songs surfaced from moments, labeled "via moments"
- Trending moments show rank (#1, #2…), engagement score, and orange border treatment
- `MomentCard` and `DiscoverSongPill` are self-contained sub-components within the file

### Create Moment from Feed
- The existing "Moment" button on `SongCard` now opens a fully functional modal:
  - Lyric picker (← → arrows through all synced lyrics)
  - Mood selector (pill buttons)
  - Caption textarea
  - Posts via `api.createMoment()` and invalidates both `moments` and `moments-trending` query keys
  - Shows a success confirmation state ("Moment Posted!") before returning to the feed

## Artist Analytics Dashboard

All charts and stats in `ArtistPortal.tsx` now use real data from the following API endpoints:

| Route | Data |
|---|---|
| `GET /api/analytics/mood-breakdown` | Plays, completions, likes, skips grouped by mood |
| `GET /api/analytics/hourly` | Play count by hour of day (0–23) extracted from `behavior_logs.created_at` |
| `GET /api/analytics/growth` | Plays per day for the last 30 days |
| `GET /api/analytics/retention/:songId` | Listen drop-off in 10-second buckets from `FLOOR(duration_seconds/10)` |

### New dashboard sections
1. **Audience Retention** — bar chart showing real skip-point distribution per 10s bucket; falls back to a smooth estimated curve when no data exists
2. **Engagement by Mood** — horizontal bars for each mood showing plays + completion rate
3. **Time of Day** — 24-bar hourly heatmap; peak hour highlighted in yellow
4. **Listener Growth** — 30-day bar chart of play volume over time
5. **Actionable Insights** — automatically generated cards:
   - ⚠ Warning if completion rate < 50%
   - ✅ Win if completion or like rate is above threshold
   - 💡 Tips based on peak hour, top-performing mood

## Navigation

5 tabs: Feed (`/`), Discover (`/search`), Moments (`/moments`), Studio (`/artist/dashboard`), Profile (`/profile`)

## Notes

- **Song ID suffixes**: The recommendation assembler appends suffixes like `-seg-r1-...` for infinite scroll uniqueness. Strip with `.split("-seg-")[0]` etc. before API calls.
- **Tailwind v4**: CSS variables in `index.css` use raw `H S% L%` format inside `@theme inline`.
- **`@keyframes equalizer`**: Defined in `client/index.html` `<style>` block for visualizer bars.
- **Seed data**: Unsplash URLs used for cover images (not local assets) since data lives in PostgreSQL.

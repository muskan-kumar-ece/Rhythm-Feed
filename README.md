# Rytham — Intelligent Music Streaming Platform

A full-stack music streaming web application with a vertical swipe feed, multi-stage AI recommendation engine, artist portal, and content moderation dashboard. Built with React, Express, PostgreSQL, and Drizzle ORM.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Folder & File Structure](#folder--file-structure)
4. [Features](#features)
5. [Tech Stack](#tech-stack)
6. [How It Works — Execution Flow](#how-it-works--execution-flow)
7. [Setup & Installation](#setup--installation)
8. [Usage](#usage)
9. [Sample Output](#sample-output)
10. [Performance & Metrics](#performance--metrics)
11. [Future Improvements](#future-improvements)

---

## Project Overview

Rytham is a music streaming social platform built around a TikTok-style vertical swipe feed. Each swipe surfaces a new song card chosen by a real-time recommendation engine that learns from the user's in-session listening behaviour — what they finish, skip, replay, and like.

**Problem it solves:** Traditional music platforms surface popular songs uniformly. Rytham addresses two gaps:

- **Discovery inequality** — new and independent artists rarely surface in mainstream feeds. Rytham's discovery boost system gives every new track a fair, engagement-gated path to wider audiences.
- **Session-blind recommendations** — most services rely purely on long-term history. Rytham layers a real-time session context (current mood, energy drift, skip patterns) on top of taste profiles so the feed adapts minute-to-minute.

**Why it matters:** By combining a behaviour-driven ranking engine with a fair distribution system and a social layer (Moments, Spotlights, follows), Rytham creates a platform where listeners discover music they genuinely resonate with and where independent artists have a real path to growing an audience.

---

## System Architecture

```
Browser (React SPA)
      │
      │  HTTPS / REST API + httpOnly JWT cookie
      ▼
Express.js Server  (server/)
      │
      ├─ Auth module          JWT signing / bcrypt password hashing
      ├─ Routes               REST endpoints for all resources
      ├─ Ranking engine       Multi-stage recommendation pipeline
      ├─ Discovery engine     Distribution score lifecycle
      ├─ AI Analysis engine   Metadata-driven tag generation
      └─ Storage layer        Drizzle ORM abstraction
              │
              ▼
      PostgreSQL Database
              │
              └─ 14 normalised tables (users, songs, moments,
                 behaviour_logs, playlists, spotlights, …)
```

### Data Flow — Feed Request

```
1. Client sends GET /api/songs?limit=N with session context payload
       (recent song IDs, session moods, energy, skip/replay signals)

2. Server fetches full song catalogue + user's behaviour log history
       from PostgreSQL via Drizzle ORM

3. Ranking engine runs three stages:
   a. Candidate Generation  — four independent pools
      (taste, trending, new, exploration)
   b. Multi-signal Scoring  — composite score per candidate
      (engagement 35%, taste 30%, recency 15%, freshness 10%, time-of-day 5%)
      + session-context overlay (mood / energy match or penalty)
      + negative-preference suppression (skipped moods/genres penalised up to -70)
      + replay boost (replayed moods/genres rewarded up to +40)
   c. MMR Diversity Pass    — greedy Maximal Marginal Relevance reorder
      (penalises same-artist and same-mood clustering in a sliding window)

4. Discovery gate filters the ranked list:
   Each song passes probabilistically (chance = distributionScore / 100).
   Full-distribution songs (score ≥ 99) always pass.

5. Server returns ranked, diverse, gated song list as JSON

6. Client AudioManager pre-buffers the next 1–2 songs in an HTML Audio pool
   for near-instant playback on swipe

7. On song completion / skip / like, client posts a behaviour log to
   POST /api/behavior — this triggers async discovery re-evaluation
```

---

## Folder & File Structure

```
Rhythm-Feed/
├── client/                     React SPA (Vite)
│   ├── index.html
│   ├── public/                 Static assets
│   └── src/
│       ├── App.tsx             Root component; route declarations
│       ├── main.tsx            React DOM entry point
│       ├── index.css           Global TailwindCSS styles
│       │
│       ├── pages/              One file per screen/route
│       │   ├── Feed.tsx            Vertical swipe feed + mood filters + onboarding
│       │   ├── Trending.tsx        Trending songs & moments leaderboard
│       │   ├── Moments.tsx         Lyric-based social posts feed
│       │   ├── MomentPage.tsx      Single moment detail view
│       │   ├── Spotlight.tsx       Artist interview audio/video cards
│       │   ├── SongPage.tsx        Full song detail with lyrics & comments
│       │   ├── Search.tsx          Full-text search across songs & artists
│       │   ├── Profile.tsx         User/artist profile + follow management
│       │   ├── PlaylistPage.tsx    Playlist detail and management
│       │   ├── ArtistPortal.tsx    Artist upload + analytics dashboard
│       │   ├── AdminDashboard.tsx  Admin moderation + platform analytics
│       │   ├── Settings.tsx        User preferences (audio, notifications)
│       │   ├── NotificationsPage.tsx  In-app notification centre
│       │   ├── Login.tsx           Authentication screen
│       │   ├── Signup.tsx          Registration screen
│       │   └── not-found.tsx       404 page
│       │
│       ├── components/
│       │   ├── Feed/
│       │   │   ├── SongCard.tsx    Full-screen swipeable song card
│       │   │   └── AIDJIntro.tsx   Animated AI DJ greeting on session start
│       │   ├── Navigation.tsx      Bottom tab bar
│       │   ├── Onboarding.tsx      First-run genre & mood preference picker
│       │   ├── AuthGuard.tsx       Redirects unauthenticated users
│       │   ├── RoleGuard.tsx       Restricts routes by user role
│       │   ├── RythamLogo.tsx      Brand logo component
│       │   ├── SettingsPanel.tsx   Reusable settings drawer
│       │   └── ui/                 Radix UI + shadcn component library
│       │
│       ├── contexts/
│       │   └── AuthContext.tsx     Global auth state (JWT user, role)
│       │
│       ├── hooks/
│       │   └── use-toast.ts        Toast notification hook
│       │
│       └── lib/
│           ├── api.ts              Typed fetch wrappers for every API endpoint
│           ├── audioManager.ts     Singleton HTML Audio pool (preload + playback)
│           ├── recommendation.ts   Client-side feed segment assembler
│           ├── session.ts          In-session listening context tracker
│           ├── tracking.ts         Behaviour event logging
│           ├── queryClient.ts      TanStack Query configuration
│           ├── dummyData.ts        Fallback data for demo mode
│           └── utils.ts            Shared utility functions
│
├── server/                     Express.js backend (Node)
│   ├── index.ts                Server entry point; binds Express + HTTP
│   ├── routes.ts               All REST API routes (auth, songs, feed, etc.)
│   ├── storage.ts              IStorage interface + Drizzle ORM implementation
│   ├── ranking.ts              Multi-stage recommendation engine
│   ├── discovery.ts            Distribution score lifecycle & engagement gate
│   ├── aiAnalysis.ts           Metadata-driven AI tag generation
│   ├── auth.ts                 JWT helpers, bcrypt, cookie management
│   ├── static.ts               Static file serving configuration
│   ├── vite.ts                 Dev-mode Vite middleware integration
│   ├── seed.ts                 Database seed script (demo songs/users)
│   └── seedSpotlights.ts       Database seed for spotlight content
│
├── shared/
│   └── schema.ts               Drizzle table definitions + Zod insert schemas
│                               (single source of truth for DB + API types)
│
├── script/
│   └── build.ts                Production build orchestration (Vite + esbuild)
│
├── uploads/                    Local file storage for uploads (git-ignored)
│   ├── audio/                  Uploaded song files (MP3/WAV/FLAC)
│   ├── video/                  Spotlight video files (MP4/MOV/WEBM)
│   ├── covers/                 Song & playlist cover images
│   └── profile/                User avatar uploads
│
├── drizzle.config.ts           Drizzle Kit configuration (schema path, DB URL)
├── vite.config.ts              Vite build configuration
├── postcss.config.js           PostCSS / Autoprefixer config
├── components.json             shadcn/ui component registry
├── tsconfig.json               TypeScript compiler options
└── package.json                Dependencies & npm scripts
```

---

## Features

### Core Features

| Feature | Description |
|---|---|
| **Vertical swipe feed** | Full-screen song cards; swipe up/down to navigate songs |
| **Mood filter tabs** | Filter feed by: For You, Focus, Night Drive, Gym, Study, Chill, Sad, Hype |
| **Audio playback** | Preloaded HTML Audio pool for instant playback; progress bar, seek, replay |
| **Behaviour tracking** | Records listen duration, skips (with skip timestamp), replays, likes, pauses |
| **Moments** | Users attach a lyric line to a song and share it as a "Moment" post |
| **Spotlight** | Artists publish audio or video interview segments; viewers like and comment |
| **Playlists** | Create, edit, and manage personal playlists with cover images |
| **Search** | Full-text search across song titles and artist names |
| **Trending** | Ranked list of songs and Moments by recent engagement velocity |
| **Profile** | User and artist profiles; follow/unfollow; display name and bio editing |
| **Notifications** | Real-time in-app notifications for follows, likes, and comments |
| **Settings** | Audio quality, autoplay, crossfade, volume normalisation, data saver, push notifications |
| **Authentication** | JWT in httpOnly cookies; bcrypt-hashed passwords; 7-day sessions |
| **Role system** | Three roles: `user`, `artist`, `admin` — each unlocks different UI and API access |

### Advanced / Unique Features

**Multi-Stage Recommendation Engine**
- Four candidate pools (taste, trending, new, exploration) merged and scored by five weighted signals
- Real-time session context: the feed adapts within the session as moods and energy levels shift
- Maximal Marginal Relevance (MMR) diversity pass prevents artist and mood clustering
- Negative preference suppression: songs sharing moods/genres with skipped tracks are penalised
- Replay boost: songs sharing moods/genres with replayed tracks are amplified
- Cold-start handling: onboarding preferences seed the first session before any history exists

**Discovery Boost System**
- Every newly uploaded song enters at `distributionScore = 10` (shown in ~10% of feeds)
- After each behaviour log, engagement metrics are computed asynchronously (completion rate, skip rate, like rate, replay rate)
- Scores are promoted on a ladder — `test → growth → broad → full` — when engagement is high
- Poor engagement suppresses a song to `score = 3` (still discoverable, not hidden)
- Probabilistic gate: a song at score 40 appears in ~40% of feed requests

**AI Track Analysis**
- On upload, each song is automatically tagged using a metadata-driven analysis engine
- Derives AI tags from genre vocabulary, mood vocabulary, energy level, tempo, and title keyword signals (e.g. "night", "fire", "love")
- Produces estimated BPM, mood categories, and up to 8 descriptive tags stored in the database

**Artist Portal**
- Upload audio (MP3/WAV/FLAC, up to 100 MB) with cover art
- Set genre, mood, tempo, and energy — AI analysis generates tags automatically
- View per-song analytics: plays, completions, skip rate, like rate, engagement score, distribution phase
- Retention curve chart (listener retention over song duration)
- Hourly play heatmap

**Admin Dashboard**
- Moderated song queue: approve or reject pending uploads with optional rejection notes
- Broadcast song uploads directly on behalf of artists
- Platform-wide analytics: total songs, total plays, skip rate, completion rate
- User management and artist upgrade request review

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript | Static typing |
| Vite 7 | Build tool and dev server |
| TailwindCSS 4 | Utility-first styling |
| Radix UI | Accessible headless component primitives |
| Framer Motion | Animations and transitions |
| TanStack Query 5 | Server state, caching, and background refetching |
| Wouter | Lightweight client-side router |
| Recharts | Analytics charts (line, bar, area) |
| Zod | Runtime schema validation (shared with backend) |
| React Hook Form | Form state and validation |
| Lucide React | Icon library |
| date-fns | Date formatting utilities |
| Sonner | Toast notifications |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js 5 | HTTP server and REST API |
| TypeScript (tsx) | Type-safe server code |
| PostgreSQL | Relational database |
| Drizzle ORM | Type-safe query builder and schema manager |
| Drizzle Zod | Auto-generate Zod schemas from Drizzle tables |
| JSON Web Tokens | Stateless authentication |
| bcrypt | Password hashing (12 salt rounds) |
| Multer | Multipart file upload handling |
| cookie-parser | HTTP cookie parsing |

### DevOps / Tooling

| Technology | Purpose |
|---|---|
| esbuild | Server bundle for production |
| drizzle-kit | Schema push and migration management |
| Replit | Cloud development and deployment environment |

---

## How It Works — Execution Flow

### 1. First Visit — Onboarding

1. User opens the app; `AuthGuard` checks for a valid JWT cookie.
2. If no onboarding preferences are stored in `localStorage`, the `Onboarding` component renders a genre and mood picker.
3. Selections are persisted to `localStorage` under `rytham_onboarding`.
4. The AI DJ intro animation plays once per browser session.

### 2. Feed Generation

1. `Feed.tsx` calls `GET /api/songs` with a `SessionContext` payload (recent song IDs, session moods, energy level, skip and replay signals from the current session).
2. The server's `rankSongsForUser()` function executes the three-stage pipeline:
   - **Stage 1 — Candidates:** builds taste, trending, new, and exploration pools from the full catalogue
   - **Stage 2 — Scoring:** assigns a 0–100 composite score to each candidate
   - **Stage 3 — Diversity:** MMR reordering penalises consecutive same-artist or same-mood slots
3. The discovery gate then filters the ranked list probabilistically by `distributionScore`.
4. The ordered song list is returned to the client as JSON.
5. `recommendation.ts` assembles the local feed segments (anchor → ranked → trending → discover → surprise slots at fixed intervals) and deduplicates against songs already shown this session.
6. `AudioManager.preload()` begins buffering the next song's audio URL in the background.

### 3. Playback and Behaviour Tracking

1. When the user lands on a song card, `AudioManager.play()` starts playback immediately if buffered.
2. A `tracking.ts` event accumulates: elapsed duration, pause count, skip timestamp (if applicable), replay count, and like state.
3. On card exit (swipe away, skip, or song end), the event is posted to `POST /api/behavior`.
4. The server writes a `behavior_logs` row and, if the song is not yet at full distribution, calls `evaluateSongDistribution()` asynchronously.
5. `evaluateSongDistribution()` reads all logs for that song, runs `computeMetrics()` and `classifyEngagement()`, then calls `adjustDistribution()` to compute the new score and phase. If the score changed, it updates the database.
6. `session.ts` also updates the in-memory `SessionContext` (mood/genre accumulators, energy drift direction) so the next feed request reflects the user's current listening state.

### 4. Artist Upload

1. Artist navigates to `/artist/upload` (requires `artist` or `admin` role).
2. The upload form collects: audio file, cover image, title, genre, mood, tempo, energy, and optional timed lyrics.
3. Client posts a `multipart/form-data` request to `POST /api/songs/upload`.
4. Server validates file types (MP3/WAV/FLAC ≤ 100 MB; images ≤ 8 MB), saves files to `uploads/audio/` and `uploads/covers/`.
5. `analyzeTrack()` generates AI tags and the initial `features` JSONB payload.
6. Song is inserted with `status = "pending"`, `distributionScore = 10`, `distributionPhase = "test"`.
7. Admin reviews the pending song and approves or rejects it from the Admin Dashboard.
8. On approval, `status` is set to `"approved"` and the song becomes eligible for feed inclusion.

### 5. Moments & Spotlights

- **Moments:** User selects a song, picks a lyric line from the timed lyrics array, adds a caption and mood, and posts to `POST /api/moments`. The moment appears in the Moments feed with like and comment interactions.
- **Spotlights:** Artists (or admins) upload an audio or video interview clip via `POST /api/spotlights/upload`. Spotlights appear on the Spotlight screen with view counting, likes, and tag-based filtering.

---

## Setup & Installation

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local instance or cloud-hosted, e.g. Neon, Supabase)
- npm ≥ 10

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/muskan-kumar-ece/Rhythm-Feed.git
cd Rhythm-Feed

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env   # if provided, otherwise create manually
```

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/rytham
JWT_SECRET=your-strong-secret-here
NODE_ENV=development
```

### Database Setup

```bash
# Push the Drizzle schema to your PostgreSQL database
npm run db:push

# (Optional) Seed demo songs and users
npx tsx server/seed.ts
npx tsx server/seedSpotlights.ts
```

### Running in Development

```bash
npm run dev
```

This starts the Express server (with Vite dev middleware injected for hot module replacement) on the port configured in the environment (default `5000`).

### Building for Production

```bash
npm run build
```

This runs `script/build.ts`, which:
1. Runs Vite to bundle the React client to `dist/public/`
2. Runs esbuild to bundle the Express server to `dist/index.cjs`

### Starting in Production

```bash
npm start
```

---

## Usage

### Running the Application

```bash
# Development (HMR enabled)
npm run dev

# Production
npm run build && npm start
```

Open `http://localhost:5000` in your browser.

### Demo Accounts

After seeding the database, the following demo accounts are available (password: `demo1234`):

| Username | Role | Access |
|---|---|---|
| `demo-user-1` | user | Feed, Moments, Spotlight, Profile |
| Any seeded artist | artist | Above + Artist Portal |
| Admin account | admin | Above + Admin Dashboard |

### Key Workflows

**Listening to music:**
Navigate to `/` → swipe up/down through song cards → tap the heart to like, the bookmark to save, or the share icon.

**Discovering by mood:**
Tap a mood chip at the top of the feed (e.g. "Gym" or "Chill") to filter the feed to that mood context.

**Creating a Moment:**
Navigate to `/moments` → tap `+` → select a song → choose a lyric line → write a caption → post.

**Uploading a track (artist):**
Navigate to `/artist/upload` → fill in metadata → upload audio and cover → submit for review.

**Moderating content (admin):**
Navigate to `/admin` → review pending songs queue → approve or reject with a note.

### Type Checking

```bash
npm run check
```

---

## Sample Output

### Feed API Response

```json
[
  {
    "id": "a1b2c3d4",
    "title": "Midnight Pulse",
    "artist": "Nova",
    "coverUrl": "/uploads/covers/1714000000000-123456789.jpg",
    "audioUrl": "/uploads/audio/1714000000000-987654321.mp3",
    "mood": "night drive",
    "likes": 482,
    "saves": 97,
    "aiTags": ["late-night", "cinematic", "synth-driven", "atmospheric", "mid-tempo"],
    "distributionScore": 75.0,
    "distributionPhase": "broad",
    "features": {
      "tempo": "medium",
      "energy": "medium",
      "genre": ["Electronic", "Ambient"],
      "mood": ["Night Drive", "Chill"]
    }
  }
]
```

### Discovery Engine Log (server console)

```
[discovery] a1b2c3d4 | test(10.0) → growth(40.0) | high engagement | comp=72% skip=14% likes=18% replays=0.31
[discovery] b2c3d4e5 | growth(40.0) → broad(75.0)  | high engagement | comp=81% skip=09% likes=22% replays=0.45
[discovery] c3d4e5f6 | test(10.0) → suppressed(4.0) | low engagement  | comp=18% skip=78% likes=00% replays=0.00
```

### Behaviour Tracking Log (browser console)

```
🎵 Tracked Behavior [Midnight Pulse]
Duration: 187s
Skipped: No
Replays: 1
Pauses: 2
Liked: Yes
Time of Day: evening
Session Length: 14.72 min
```

---

## Performance & Metrics

### Recommendation Engine

| Signal | Weight in composite score |
|---|---|
| Engagement quality (plays, completions, likes, replays) | 35% |
| Taste similarity (mood + genre profile match) | 30% |
| Recent user behaviour (48h liked/replayed, 24h skipped) | 15% |
| Recency / freshness (upload date) | 10% |
| Time-of-day context | 5% |

Session context overlay (±70 penalty for skipped-mood matches, +40 boost for replayed-mood matches) is applied on top of the composite score.

### Discovery Boost Ladder

| Phase | Score Range | Feed Inclusion Rate |
|---|---|---|
| `test` | 8–15 | ~10% of feeds |
| `growth` | 30–50 | ~40% of feeds |
| `broad` | 70–85 | ~75% of feeds |
| `full` | ≥ 99 | 100% of feeds |
| `suppressed` | 3–7 | ~3% of feeds |

Promotion from `test` to `growth` requires a minimum of 3 behaviour logs with high engagement (completion rate ≥ 55% and like rate ≥ 12%, or similar strong positive signals).

### File Upload Limits

| Type | Max Size | Accepted Formats |
|---|---|---|
| Audio | 100 MB | MP3, WAV, FLAC |
| Cover image | 8 MB | JPG, PNG, WEBP, GIF |
| Profile avatar | 2 MB | JPG, PNG, WEBP, GIF |
| Spotlight video | 100 MB | MP4, MOV, WEBM |

---

## Future Improvements

- **Real audio ML pipeline** — replace the metadata-heuristic AI analysis with an actual audio fingerprinting and feature extraction model (e.g. librosa, Essentia, or a cloud ML API) to derive BPM, key, energy, and genre directly from the audio waveform.
- **WebSocket real-time feed updates** — push new song approvals and trending changes to connected clients without polling.
- **Collaborative playlists** — allow multiple users to contribute to a shared playlist.
- **Offline listening** — cache audio using the Service Worker Cache API for offline playback.
- **Email notifications** — integrate a transactional email service for password resets and activity digests.
- **Social graph recommendations** — factor in what followed artists and users are listening to when generating the taste pool.
- **Waveform visualisation** — render a real audio waveform scrubber on song cards instead of the seeded-deterministic fallback.
- **A/B testing infrastructure** — run controlled experiments on ranking weight configurations to measure engagement impact.
- **Rate limiting** — add per-IP and per-user rate limits to the auth and upload endpoints.
- **CDN integration** — move uploaded files from local disk to object storage (S3, Cloudflare R2) with a CDN layer for global low-latency delivery.

---

## License

MIT

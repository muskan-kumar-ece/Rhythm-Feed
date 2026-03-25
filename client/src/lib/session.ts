/**
 * VibeScroll Session Awareness
 *
 * Tracks what the user has listened to (and skipped) in the current listening
 * session, then derives a compact SessionContext that the server can use to
 * boost songs matching the user's *right-now* mood instead of only relying on
 * long-term history.
 *
 * Session lifecycle
 * ─────────────────
 * A "session" is a continuous listening period.  If more than SESSION_TIMEOUT_MS
 * passes between two interactions the session is automatically reset so stale
 * context from yesterday's playlist doesn't colour today's feed.
 *
 * The context is sent to /api/songs/ranked as ?ctx=<url-encoded-json>.
 * The server then applies a dedicated 20%-weight scoring component.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionEntry {
  songId:      string;
  title:       string;
  artist:      string;
  moods:       string[];
  genres:      string[];
  energy:      string;       // "high" | "medium" | "low"
  liked:       boolean;
  skipped:     boolean;
  durationSec: number;
  playedAt:    number;       // unix ms
}

export interface SessionContext {
  /** IDs of the last 10 listened (non-skipped) songs. */
  recentSongIds:  string[];
  /** Top 3 moods by frequency across completed listens. */
  sessionMoods:   string[];
  /** Top 3 genres by frequency across completed listens. */
  sessionGenres:  string[];
  /** Dominant energy level ("high" | "medium" | "low"). */
  sessionEnergy:  string;
  /** Energy trend across the last 5 songs ("up" | "down" | "stable"). */
  energyDrift:    string;
  /** Total songs recorded in this session (including skips). */
  sessionLength:  number;
  /** Unix ms when the session started. */
  startedAt:      number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max inactivity before resetting the session (30 min). */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Energy values used for drift comparison. */
const ENERGY_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };

// ─── State ────────────────────────────────────────────────────────────────────

let _entries: SessionEntry[]  = [];
let _sessionStartedAt: number = Date.now();
let _lastActivityAt: number   = Date.now();

// ─── Session Reset ────────────────────────────────────────────────────────────

function maybeResetSession() {
  if (Date.now() - _lastActivityAt > SESSION_TIMEOUT_MS) {
    _entries          = [];
    _sessionStartedAt = Date.now();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a song interaction.  Called by SongCard after a card becomes inactive
 * (alongside `trackListenBehavior` and `api.logBehavior`).
 */
export function recordSessionPlay(entry: Omit<SessionEntry, "playedAt">) {
  maybeResetSession();
  _lastActivityAt = Date.now();

  _entries.push({ ...entry, playedAt: Date.now() });

  // Keep only the last 20 entries so memory stays bounded
  if (_entries.length > 20) _entries = _entries.slice(-20);
}

/** Return the current session length (total songs seen, including skips). */
export function getSessionLength(): number {
  maybeResetSession();
  return _entries.length;
}

/**
 * Derive the `SessionContext` from the current session entries.
 * Returns `null` when fewer than 2 entries have been recorded
 * (not enough signal to be meaningful yet).
 */
export function getSessionContext(): SessionContext | null {
  maybeResetSession();
  if (_entries.length < 2) return null;

  // Only fully-listened songs contribute to inferred preferences
  const completed = _entries.filter(e => !e.skipped);

  // ── Mood frequency ranking ────────────────────────────────────────────────
  const moodCount: Record<string, number> = {};
  for (const e of completed) {
    for (const m of e.moods) {
      // Liked songs contribute 2× weight to mood count
      moodCount[m] = (moodCount[m] || 0) + (e.liked ? 2 : 1);
    }
  }
  const sessionMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => m);

  // ── Genre frequency ranking ───────────────────────────────────────────────
  const genreCount: Record<string, number> = {};
  for (const e of completed) {
    for (const g of e.genres) {
      genreCount[g] = (genreCount[g] || 0) + 1;
    }
  }
  const sessionGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  // ── Dominant energy ───────────────────────────────────────────────────────
  const energyCount: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const e of completed) {
    const key = e.energy in energyCount ? e.energy : "medium";
    energyCount[key]++;
  }
  const sessionEnergy = (
    Object.entries(energyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "medium"
  );

  // ── Energy drift (compare first half vs second half of completed listens) ──
  let energyDrift = "stable";
  if (completed.length >= 4) {
    const half = Math.floor(completed.length / 2);
    const early = completed.slice(0, half);
    const late  = completed.slice(half);

    const avgRank = (arr: SessionEntry[]) =>
      arr.reduce((s, e) => s + (ENERGY_RANK[e.energy] ?? 1), 0) / arr.length;

    const diff = avgRank(late) - avgRank(early);
    if      (diff >  0.3) energyDrift = "up";
    else if (diff < -0.3) energyDrift = "down";
  }

  // ── Recent song IDs (non-skipped, last 10) ────────────────────────────────
  const recentSongIds = completed
    .slice(-10)
    .map(e => e.songId);

  return {
    recentSongIds,
    sessionMoods,
    sessionGenres,
    sessionEnergy,
    energyDrift,
    sessionLength: _entries.length,
    startedAt:     _sessionStartedAt,
  };
}

/**
 * Read the top mood from the current session for display purposes.
 * Returns `null` when the session has fewer than 3 entries.
 */
export function getSessionTopMood(): string | null {
  if (_entries.length < 3) return null;
  const ctx = getSessionContext();
  return ctx?.sessionMoods[0] ?? null;
}

/** Fully reset the session (called on page reload or user log-out). */
export function resetSession() {
  _entries          = [];
  _sessionStartedAt = Date.now();
  _lastActivityAt   = Date.now();
}

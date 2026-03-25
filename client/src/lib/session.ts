/**
 * VibeScroll Session Awareness
 *
 * Tracks what the user has listened to (and skipped) in the current listening
 * session, then derives a compact SessionContext that the server can use to
 * boost songs matching the user's *right-now* mood instead of only relying on
 * long-term history.
 *
 * Additionally tracks:
 * - Negative preferences from skipped songs (moods/genres to suppress)
 * - Replay boosts from replayed songs (moods/genres to amplify)
 * - Cold-start context from onboarding prefs for first-time users
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionEntry {
  songId:      string;
  title:       string;
  artist:      string;
  moods:       string[];
  genres:      string[];
  energy:      string;
  liked:       boolean;
  skipped:     boolean;
  replays:     number;
  durationSec: number;
  playedAt:    number;
}

export interface SessionContext {
  recentSongIds:  string[];
  sessionMoods:   string[];
  sessionGenres:  string[];
  sessionEnergy:  string;
  energyDrift:    string;
  sessionLength:  number;
  startedAt:      number;
  negativePreferences?: {
    moods:  Record<string, number>;
    genres: Record<string, number>;
  };
  replayBoosts?: {
    moods:  Record<string, number>;
    genres: Record<string, number>;
  };
  isColdStart?:     boolean;
  onboardingPrefs?: { genres: string[]; moods: string[] };
}

export interface OnboardingPrefs {
  moods:       string[];
  genres:      string[];
  completedAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS  = 30 * 60 * 1000;
const ONBOARDING_KEY      = "rytham_onboarding";
const ENERGY_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };

// ─── State ────────────────────────────────────────────────────────────────────

let _entries:           SessionEntry[]                                    = [];
let _sessionStartedAt:  number                                            = Date.now();
let _lastActivityAt:    number                                            = Date.now();
let _negativeProfile:   { moods: Record<string, number>; genres: Record<string, number> } = { moods: {}, genres: {} };
let _replayBoosts:      { moods: Record<string, number>; genres: Record<string, number> } = { moods: {}, genres: {} };

// ─── Session Reset ────────────────────────────────────────────────────────────

function maybeResetSession() {
  if (Date.now() - _lastActivityAt > SESSION_TIMEOUT_MS) {
    _entries           = [];
    _sessionStartedAt  = Date.now();
    _negativeProfile   = { moods: {}, genres: {} };
    _replayBoosts      = { moods: {}, genres: {} };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordSessionPlay(entry: Omit<SessionEntry, "playedAt">) {
  maybeResetSession();
  _lastActivityAt = Date.now();
  _entries.push({ ...entry, playedAt: Date.now() });
  if (_entries.length > 20) _entries = _entries.slice(-20);

  // ── Negative preference tracking (aggressive skip learning) ────────────────
  if (entry.skipped) {
    for (const m of entry.moods) {
      _negativeProfile.moods[m] = (_negativeProfile.moods[m] || 0) + 1;
    }
    for (const g of entry.genres) {
      _negativeProfile.genres[g] = (_negativeProfile.genres[g] || 0) + 1;
    }
  }

  // ── Replay boost tracking ───────────────────────────────────────────────────
  if (!entry.skipped && entry.replays > 0) {
    for (const m of entry.moods) {
      _replayBoosts.moods[m] = (_replayBoosts.moods[m] || 0) + entry.replays;
    }
    for (const g of entry.genres) {
      _replayBoosts.genres[g] = (_replayBoosts.genres[g] || 0) + entry.replays;
    }
  }
}

export function getSessionLength(): number {
  maybeResetSession();
  return _entries.length;
}

export function getSessionContext(): SessionContext | null {
  maybeResetSession();
  if (_entries.length < 2) return null;

  const completed = _entries.filter(e => !e.skipped);

  // ── Mood frequency (liked songs count 2×) ─────────────────────────────────
  const moodCount: Record<string, number> = {};
  for (const e of completed) {
    for (const m of e.moods) {
      moodCount[m] = (moodCount[m] || 0) + (e.liked ? 2 : 1);
    }
  }
  const sessionMoods = Object.entries(moodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([m]) => m);

  // ── Genre frequency ────────────────────────────────────────────────────────
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

  // ── Dominant energy ────────────────────────────────────────────────────────
  const energyCount: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const e of completed) {
    const key = e.energy in energyCount ? e.energy : "medium";
    energyCount[key]++;
  }
  const sessionEnergy =
    Object.entries(energyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "medium";

  // ── Energy drift ───────────────────────────────────────────────────────────
  let energyDrift = "stable";
  if (completed.length >= 4) {
    const half  = Math.floor(completed.length / 2);
    const early = completed.slice(0, half);
    const late  = completed.slice(half);
    const avgRank = (arr: SessionEntry[]) =>
      arr.reduce((s, e) => s + (ENERGY_RANK[e.energy] ?? 1), 0) / arr.length;
    const diff = avgRank(late) - avgRank(early);
    if      (diff >  0.3) energyDrift = "up";
    else if (diff < -0.3) energyDrift = "down";
  }

  const recentSongIds = completed.slice(-10).map(e => e.songId);

  return {
    recentSongIds,
    sessionMoods,
    sessionGenres,
    sessionEnergy,
    energyDrift,
    sessionLength: _entries.length,
    startedAt:     _sessionStartedAt,
    negativePreferences: {
      moods:  { ..._negativeProfile.moods },
      genres: { ..._negativeProfile.genres },
    },
    replayBoosts: {
      moods:  { ..._replayBoosts.moods },
      genres: { ..._replayBoosts.genres },
    },
  };
}

export function getSessionTopMood(): string | null {
  if (_entries.length < 3) return null;
  return getSessionContext()?.sessionMoods[0] ?? null;
}

export function resetSession() {
  _entries          = [];
  _sessionStartedAt = Date.now();
  _lastActivityAt   = Date.now();
  _negativeProfile  = { moods: {}, genres: {} };
  _replayBoosts     = { moods: {}, genres: {} };
}

// ─── Onboarding Prefs ─────────────────────────────────────────────────────────

export function getOnboardingPrefs(): OnboardingPrefs | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingPrefs(prefs: Omit<OnboardingPrefs, "completedAt">) {
  const full: OnboardingPrefs = { ...prefs, completedAt: Date.now() };
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(full));
}

/**
 * Build a synthetic SessionContext from onboarding prefs.
 * Used immediately after onboarding so the ranking engine has strong
 * preference signal before the user has listened to any songs.
 */
export function buildColdStartContext(prefs: { genres: string[]; moods: string[] }): SessionContext {
  return {
    recentSongIds:  [],
    sessionMoods:   prefs.moods,
    sessionGenres:  prefs.genres,
    sessionEnergy:  "medium",
    energyDrift:    "stable",
    sessionLength:  5,
    startedAt:      Date.now(),
    isColdStart:    true,
    onboardingPrefs: { genres: prefs.genres, moods: prefs.moods },
    negativePreferences: { moods: {}, genres: {} },
    replayBoosts:        { moods: {}, genres: {} },
  };
}

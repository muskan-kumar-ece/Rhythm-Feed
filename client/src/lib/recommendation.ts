import { ApiSong } from "./api";
import { behaviorLogs } from "./tracking";

// ─── Song Pool ────────────────────────────────────────────────────────────────
// The Feed page populates this with server-ranked songs.
// The server has already applied: taste profile, engagement, trending, diversity.

let _rankedPool: ApiSong[] = [];
let _poolVersion = 0;

export function setSongsPool(songs: ApiSong[]) {
  _rankedPool = songs;
  _poolVersion++;
}

export function getSongsPool(): ApiSong[] {
  return _rankedPool;
}

// ─── Shown Songs Tracker ──────────────────────────────────────────────────────
// Track base IDs of songs shown in the current session to avoid immediate repeats.
const _shownBaseIds = new Set<string>();

export function markSongShown(songId: string) {
  _shownBaseIds.add(stripSuffix(songId));
}

function stripSuffix(id: string): string {
  return id
    .split("-rank-")[0]
    .split("-rapid-")[0]
    .split("-discover")[0]
    .split("-new")[0]
    .split("-mood-")[0]
    .split("-seg-")[0];
}

// ─── Segment Types ────────────────────────────────────────────────────────────
// The feed is built from typed segments so we can display subtle UI hints later.
type SegmentSlot =
  | "ranked"       // top-ranked personalised pick
  | "trending"     // high trending score
  | "discover"     // lower-ranked discovery pick
  | "recent"       // newest uploads
  | "mood";        // mood-contextual

interface SegmentEntry {
  song: ApiSong;
  slotType: SegmentSlot;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tagSong(song: ApiSong, slotType: SegmentSlot, suffix: string): ApiSong {
  return {
    ...song,
    id: `${song.id}-${suffix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

/**
 * Pick a song from the given pool, preferring songs not shown in this session.
 * Falls back to already-shown songs if the pool is exhausted.
 * `topFraction` limits picks to the top N% of the pool (higher = more personalised).
 */
function pickFrom(pool: ApiSong[], topFraction = 1.0): ApiSong {
  const limit = Math.max(1, Math.ceil(pool.length * topFraction));
  const candidates = pool.slice(0, limit);

  // Prefer unseen
  const unseen = candidates.filter(s => !_shownBaseIds.has(s.id));
  const source = unseen.length > 0 ? unseen : candidates;

  return source[Math.floor(Math.random() * source.length)];
}

// ─── Local Score Helpers (used only for intra-pool sorting, not re-ranking) ───

function getTrendScore(song: ApiSong): number {
  const pop = song.features.popularity;
  const r = pop.recent24h;
  if (r.plays === 0) return 0;
  return (r.likes / r.plays) * 40 + (r.replays / r.plays) * 40 + (r.comments / r.plays) * 20;
}

// ─── Main Feed Generator ──────────────────────────────────────────────────────

/**
 * Generates one feed segment (6 cards) from the server-ranked pool.
 *
 * Slot pattern per segment:
 *   1. ranked-top    – top-ranked personalised pick (top 40%)
 *   2. ranked-top    – second personalised pick (top 40%)
 *   3. trending      – highest recent24h velocity song
 *   4. discover      – lower-half discovery pick (40-100%)
 *   5. ranked-mid    – mid-tier personalised pick (top 60%)
 *   6. recent        – newest upload
 *
 * Because the server already sorted by composite score + diversity, simply
 * drawing from different slices produces a well-balanced feed without
 * re-running expensive scoring on the client.
 */
export function generateFeedSegment(): ApiSong[] {
  const pool = _rankedPool;
  if (pool.length === 0) return [];

  // Derived sub-pools (server already handles overall order; these are view slices)
  const topPool = pool.slice(0, Math.ceil(pool.length * 0.4));   // top 40%
  const midPool = pool.slice(0, Math.ceil(pool.length * 0.6));   // top 60%
  const bottomPool = pool.slice(Math.floor(pool.length * 0.4));  // bottom 60% for discovery
  const trendPool = [...pool].sort((a, b) => getTrendScore(b) - getTrendScore(a));
  const newPool = [...pool].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const segment: ApiSong[] = [];

  const pick = (source: ApiSong[], slotType: SegmentSlot, suffix: string, fraction = 1.0) => {
    const base = pickFrom(source, fraction);
    const tagged = tagSong(base, slotType, suffix);
    markSongShown(base.id);
    segment.push(tagged);
  };

  pick(topPool,    "ranked",   "seg-r1", 0.6);   // best personalised
  pick(topPool,    "ranked",   "seg-r2", 0.6);   // second personalised
  pick(trendPool,  "trending", "seg-tr", 0.5);   // viral/trending
  pick(bottomPool, "discover", "seg-dv");         // serendipity
  pick(midPool,    "ranked",   "seg-r3", 0.7);   // mid-tier personalised
  pick(newPool,    "recent",   "seg-nw", 0.7);   // fresh content

  return segment;
}

// ─── Mood Feed Segment ────────────────────────────────────────────────────────

/**
 * Generates a mood-specific segment, re-scoring within the mood subset using
 * engagement quality to order picks.
 */
export function generateMoodFeedSegment(targetMood: string): ApiSong[] {
  const pool = _rankedPool;
  if (pool.length === 0) return [];

  const moodPool = pool.filter(s => s.features.mood.includes(targetMood));
  const source = moodPool.length > 0 ? moodPool : pool;

  const segment: ApiSong[] = [];
  for (let i = 0; i < 5; i++) {
    const base = pickFrom(source, 0.8);
    segment.push(
      tagSong(base, "mood", `mood-${targetMood.replace(/\s+/g, "_")}-${i}`)
    );
    markSongShown(base.id);
  }

  return segment;
}

// ─── Cold-Start Feed Segment ──────────────────────────────────────────────────

/**
 * Generates the very first feed segment for a new user who just completed
 * onboarding. Picks the highest-scoring songs that match their stated moods
 * and genres, ensuring strong relevance from swipe 1.
 *
 * Rules:
 * - Only songs matching at least one selected mood OR genre qualify
 * - Sorted by match score + server _score so the best songs come first
 * - No same artist in consecutive positions (diversity)
 * - Falls back to top ranked songs if match pool is too small
 */
export function generateColdStartFeedSegment(prefs: { moods: string[]; genres: string[] }): ApiSong[] {
  const pool = _rankedPool;
  if (pool.length === 0) return [];

  const moodSet  = new Set(prefs.moods);
  const genreSet = new Set(prefs.genres);

  // Score each song by preference match + server engagement score
  const scored = pool.map(song => {
    let matchScore = 0;
    for (const m of song.features.mood) {
      if (moodSet.has(m)) matchScore += 30;
    }
    for (const g of song.features.genre) {
      if (genreSet.has(g)) matchScore += 22;
    }
    const serverScore = song._score || 0;
    return { song, totalScore: matchScore + serverScore * 0.5 };
  });

  // Sort: preference-matching songs first, then by engagement
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // Pick artist-diverse selection for first 5 slots
  const selected: ApiSong[] = [];
  const seenArtists  = new Set<string>();
  const seenBaseIds  = new Set<string>();

  for (const { song, totalScore: _ } of scored) {
    if (selected.length >= 5) break;

    const baseId = stripSuffix(song.id);
    if (seenBaseIds.has(baseId)) continue;

    // Avoid consecutive same artist in first 3 picks
    if (seenArtists.has(song.artist) && selected.length < 3) continue;

    selected.push(tagSong(song, "ranked", `cold-${selected.length}`));
    seenArtists.add(song.artist);
    seenBaseIds.add(baseId);
    markSongShown(song.id);
  }

  // Pad with normal segment if not enough matched
  if (selected.length < 5) {
    const rest = generateFeedSegment();
    selected.push(...rest.slice(0, 5 - selected.length));
  }

  // Append more so infinite scroll works immediately
  const extra = generateFeedSegment();
  return [...selected, ...extra];
}

// ─── Legacy exports (kept for compatibility with Feed.tsx) ────────────────────

export function calculateViralScore(song: ApiSong): number {
  const pop = song.features.popularity;
  if (pop.plays === 0) return 0;
  const cr = pop.completions / pop.plays;
  const rr = pop.replays / pop.plays;
  const lr = pop.likes / pop.plays;
  const sr = pop.shares / pop.plays;
  const vol = Math.min(1 + Math.log10(pop.plays + 1) * 0.1, 1.5);
  return Math.min((cr * 30 + rr * 25 + sr * 25 + lr * 15) * vol * 100, 100);
}

export function calculateTrendingScore(song: ApiSong): number {
  return getTrendScore(song);
}

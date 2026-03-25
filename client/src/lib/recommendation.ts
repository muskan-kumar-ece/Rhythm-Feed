import { ApiSong } from "./api";
import { behaviorLogs } from "./tracking";

// ─── Song Pool ────────────────────────────────────────────────────────────────
let _rankedPool: ApiSong[] = [];
let _poolVersion = 0;

export function setSongsPool(songs: ApiSong[]) {
  _rankedPool = songs;
  _poolVersion++;
}

export function getSongsPool(): ApiSong[] {
  return _rankedPool;
}

// ─── Session shown tracker ────────────────────────────────────────────────────
// Tracks base IDs shown this session to avoid re-showing songs.
const _shownBaseIds = new Set<string>();

// Global feed position — increments with each card added across all segments.
// Used to insert surprise slots at regular intervals.
let _globalFeedPosition = 0;

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
    .split("-seg-")[0]
    .split("-cold-")[0];
}

// ─── Segment Types ────────────────────────────────────────────────────────────
type SegmentSlot = "anchor" | "ranked" | "trending" | "discover" | "recent" | "mood" | "surprise";

function tagSong(song: ApiSong, slotType: SegmentSlot, suffix: string): ApiSong {
  return {
    ...song,
    id: `${song.id}-${suffix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function getTrendScore(song: ApiSong): number {
  const pop = song.features.popularity;
  const r = pop.recent24h;
  if (r.plays === 0) return 0;
  return (r.likes / r.plays) * 40 + (r.replays / r.plays) * 40 + (r.comments / r.plays) * 20;
}

function primaryGenre(song: ApiSong): string {
  return song.features.genre[0] ?? "unknown";
}

function primaryMood(song: ApiSong): string {
  return song.features.mood[0] ?? "unknown";
}

// ─── Diversity-aware picker ───────────────────────────────────────────────────
/**
 * Pick a song from `pool`, preferring:
 *  1. Unseen songs
 *  2. Different artist than the last N artists in `recentArtists`
 *  3. Different primary genre than the last N genres in `recentGenres`
 *
 * `topFraction` limits to the top N% of the pool (pool must already be sorted
 * by relevance).  Falls back progressively if constraints can't be met.
 */
function diversePick(
  pool: ApiSong[],
  topFraction: number,
  recentArtists: string[],
  recentGenres: string[],
): ApiSong {
  const limit = Math.max(1, Math.ceil(pool.length * topFraction));
  const candidates = pool.slice(0, limit);

  const artistSet = new Set(recentArtists);
  const genreSet  = new Set(recentGenres);

  // Tier 1: unseen + different artist + different genre
  const tier1 = candidates.filter(s =>
    !_shownBaseIds.has(s.id) &&
    !artistSet.has(s.artist) &&
    !genreSet.has(primaryGenre(s))
  );
  if (tier1.length > 0) return tier1[Math.floor(Math.random() * tier1.length)];

  // Tier 2: unseen + different artist
  const tier2 = candidates.filter(s =>
    !_shownBaseIds.has(s.id) &&
    !artistSet.has(s.artist)
  );
  if (tier2.length > 0) return tier2[Math.floor(Math.random() * tier2.length)];

  // Tier 3: unseen (any artist/genre)
  const tier3 = candidates.filter(s => !_shownBaseIds.has(s.id));
  if (tier3.length > 0) return tier3[Math.floor(Math.random() * tier3.length)];

  // Tier 4: fallback — pick anything from candidates
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─── Surprise / Wildcard picker ───────────────────────────────────────────────
/**
 * Returns a song from the *bottom 30%* of the pool that is different in genre
 * from recent songs — the "pleasant surprise" that keeps the feed exciting.
 */
function surprisePick(recentGenres: string[]): ApiSong {
  const pool = _rankedPool;
  const start = Math.floor(pool.length * 0.55); // bottom ~45%
  const wildcardPool = pool.slice(start);
  const genreSet = new Set(recentGenres);

  const fresh = wildcardPool.filter(s =>
    !_shownBaseIds.has(s.id) && !genreSet.has(primaryGenre(s))
  );
  const source = fresh.length > 0 ? fresh : wildcardPool;
  return source[Math.floor(Math.random() * source.length)];
}

// ─── Main Feed Generator ──────────────────────────────────────────────────────
/**
 * Generates one feed segment (6 cards) from the server-ranked pool.
 *
 * Slot pattern:
 *   1. anchor    – top 20%  — most relevant pick  (best personal match)
 *   2. anchor    – top 25%  — second strong pick
 *   3. ranked    – top 35%  — third relevant pick
 *   4. trending  – top 50% by trend score          (viral momentum)
 *   5. discover  – bottom 50%                       (serendipity)
 *   6. recent    – newest upload or SURPRISE         (freshness / delight)
 *
 * Diversity rules (applied globally per segment):
 *  • No same artist in consecutive positions
 *  • No same primary genre in consecutive positions
 *  • Every 6th global feed position inserts a surprise pick
 */
export function generateFeedSegment(): ApiSong[] {
  const pool = _rankedPool;
  if (pool.length === 0) return [];

  const topPool     = pool.slice(0, Math.ceil(pool.length * 0.20));
  const top25Pool   = pool.slice(0, Math.ceil(pool.length * 0.25));
  const top35Pool   = pool.slice(0, Math.ceil(pool.length * 0.35));
  const trendPool   = [...pool].sort((a, b) => getTrendScore(b) - getTrendScore(a))
                               .slice(0, Math.ceil(pool.length * 0.50));
  const bottomPool  = pool.slice(Math.floor(pool.length * 0.50));
  const newPool     = [...pool].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const segment: ApiSong[] = [];
  const recentArtists: string[] = [];
  const recentGenres:  string[] = [];

  const addSong = (source: ApiSong[], slotType: SegmentSlot, suffix: string, fraction = 1.0) => {
    _globalFeedPosition++;

    // Surprise override: every 6th global position, inject a wildcard
    const isSurpriseSlot = _globalFeedPosition % 6 === 0;
    let base: ApiSong;
    if (isSurpriseSlot && slotType !== "anchor") {
      base = surprisePick(recentGenres.slice(-2));
      slotType = "surprise";
    } else {
      base = diversePick(source, fraction, recentArtists.slice(-2), recentGenres.slice(-2));
    }

    const tagged = tagSong(base, slotType, suffix);
    markSongShown(base.id);

    recentArtists.push(base.artist);
    recentGenres.push(primaryGenre(base));

    segment.push(tagged);
  };

  // Slot 1 & 2: Locked to absolute top (anchor picks — no surprise override)
  _globalFeedPosition++;
  {
    const base = diversePick(topPool, 1.0, [], recentGenres.slice(-2));
    segment.push(tagSong(base, "anchor", "seg-a1"));
    markSongShown(base.id);
    recentArtists.push(base.artist);
    recentGenres.push(primaryGenre(base));
  }

  _globalFeedPosition++;
  {
    const base = diversePick(top25Pool, 1.0, recentArtists.slice(-1), recentGenres.slice(-1));
    segment.push(tagSong(base, "anchor", "seg-a2"));
    markSongShown(base.id);
    recentArtists.push(base.artist);
    recentGenres.push(primaryGenre(base));
  }

  // Slots 3-6: use the diversity-aware picker with surprise injection
  addSong(top35Pool,   "ranked",   "seg-r3");
  addSong(trendPool,   "trending", "seg-tr");
  addSong(bottomPool,  "discover", "seg-dv");
  addSong(newPool,     "recent",   "seg-nw");

  return segment;
}

// ─── Mood Feed Segment ────────────────────────────────────────────────────────
export function generateMoodFeedSegment(targetMood: string): ApiSong[] {
  const pool = _rankedPool;
  if (pool.length === 0) return [];

  const moodPool = pool.filter(s => s.features.mood.includes(targetMood));
  const source = moodPool.length >= 4 ? moodPool : pool;

  const segment: ApiSong[] = [];
  const recentArtists: string[] = [];
  const recentGenres:  string[] = [];

  for (let i = 0; i < 6; i++) {
    const base = diversePick(source, 0.85, recentArtists.slice(-2), recentGenres.slice(-2));
    segment.push(tagSong(base, "mood", `mood-${targetMood.replace(/\s+/g, "_")}-${i}`));
    markSongShown(base.id);
    recentArtists.push(base.artist);
    recentGenres.push(primaryGenre(base));
  }

  return segment;
}

// ─── Cold-Start Feed Segment ──────────────────────────────────────────────────
/**
 * First feed for new users.  Pins the strongest preference matches in
 * positions 1-3, enforces artist diversity, and then fills out with
 * normal segments.
 */
export function generateColdStartFeedSegment(prefs: { moods: string[]; genres: string[] }): ApiSong[] {
  const pool = _rankedPool;
  if (pool.length === 0) return [];

  const moodSet  = new Set(prefs.moods);
  const genreSet = new Set(prefs.genres);

  const scored = pool.map(song => {
    let matchScore = 0;
    for (const m of song.features.mood)  { if (moodSet.has(m))  matchScore += 30; }
    for (const g of song.features.genre) { if (genreSet.has(g)) matchScore += 22; }
    return { song, totalScore: matchScore + (song._score ?? 0) * 0.5 };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);

  const selected:    ApiSong[] = [];
  const seenArtists  = new Set<string>();
  const seenBaseIds  = new Set<string>();
  const recentGenres: string[] = [];

  for (const { song } of scored) {
    if (selected.length >= 6) break;

    const baseId = stripSuffix(song.id);
    if (seenBaseIds.has(baseId)) continue;

    // First 3 slots: avoid same artist
    if (seenArtists.has(song.artist) && selected.length < 3) continue;

    // No consecutive same genre in first 3
    if (selected.length > 0 &&
        selected.length < 3 &&
        recentGenres[recentGenres.length - 1] === primaryGenre(song)) continue;

    selected.push(tagSong(song, "anchor", `cold-${selected.length}`));
    seenArtists.add(song.artist);
    seenBaseIds.add(baseId);
    recentGenres.push(primaryGenre(song));
    markSongShown(song.id);
  }

  // Pad with normal segment if not enough matched
  if (selected.length < 6) {
    const rest = generateFeedSegment();
    selected.push(...rest.slice(0, 6 - selected.length));
  }

  // Append extra segment so infinite scroll works immediately
  return [...selected, ...generateFeedSegment()];
}

// ─── Legacy exports ───────────────────────────────────────────────────────────

export function calculateViralScore(song: ApiSong): number {
  const pop = song.features.popularity;
  if (pop.plays === 0) return 0;
  const cr = pop.completions / pop.plays;
  const rr = pop.replays    / pop.plays;
  const lr = pop.likes      / pop.plays;
  const sr = pop.shares     / pop.plays;
  const vol = Math.min(1 + Math.log10(pop.plays + 1) * 0.1, 1.5);
  return Math.min((cr * 30 + rr * 25 + sr * 25 + lr * 15) * vol * 100, 100);
}

export function calculateTrendingScore(song: ApiSong): number {
  return getTrendScore(song);
}

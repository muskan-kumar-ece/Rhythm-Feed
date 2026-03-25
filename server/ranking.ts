/**
 * VibeScroll Multi-Stage Recommendation Engine
 *
 * Stage 1 – Candidate Generation
 *   Build four independent candidate pools from the full song catalogue,
 *   each representing a different selection strategy.
 *
 * Stage 2 – Scoring
 *   Compute a composite relevance score for every candidate using:
 *   engagement quality (35%), taste similarity (30%), recent user behavior (15%),
 *   recency / freshness (10%), time-of-day context (5%),
 *   plus a flat pool-consensus bonus for songs nominated by multiple pools.
 *
 * Stage 3 – Ranking & Diversity
 *   Sort candidates by score, then run a greedy Maximal Marginal Relevance (MMR)
 *   pass that penalises same-artist and same-mood repetition within a sliding
 *   window of recently placed songs.
 */

import type { Song, BehaviorLog } from "@shared/schema";
import { applyDistributionGate } from "./discovery";

// ─── Session Context ──────────────────────────────────────────────────────────

/** Mirrors the SessionContext type sent by the client. */
export interface SessionContext {
  recentSongIds:  string[];
  sessionMoods:   string[];
  sessionGenres:  string[];
  sessionEnergy:  string;
  energyDrift:    string;
  sessionLength:  number;
  startedAt:      number;
  /** Moods/genres the user has skipped this session — used to suppress similar songs. */
  negativePreferences?: {
    moods:  Record<string, number>;
    genres: Record<string, number>;
  };
  /** Moods/genres from replayed songs — used to amplify similar songs. */
  replayBoosts?: {
    moods:  Record<string, number>;
    genres: Record<string, number>;
  };
  /** True for first-time users who just completed onboarding. */
  isColdStart?:     boolean;
  /** Stated preferences from the onboarding flow. */
  onboardingPrefs?: { genres: string[]; moods: string[] };
}

/**
 * Mood opposition table.
 * When the session is dominated by a mood from this map, songs tagged with
 * any of the opposing moods receive a penalty.
 */
const OPPOSING_MOODS: Record<string, string[]> = {
  Chill:     ["Gym", "Aggressive", "Hype"],
  Sad:       ["Gym", "Hype", "Aggressive"],
  Relax:     ["Gym", "Aggressive", "Hype"],
  Study:     ["Gym", "Aggressive", "Hype"],
  Cozy:      ["Gym", "Aggressive", "Hype"],
  Gym:       ["Sad", "Chill", "Relax", "Cozy"],
  Hype:      ["Sad", "Melancholy", "Relax", "Cozy"],
  Aggressive:["Sad", "Chill", "Relax", "Cozy"],
};

// ─── Pool Types ───────────────────────────────────────────────────────────────

/** Which candidate pools a song was nominated by. */
type Pool = "taste" | "trending" | "new" | "exploration";

interface Candidate {
  song: Song;
  pools: Pool[];           // pools that nominated this song
}

// ─── Taste Profile ────────────────────────────────────────────────────────────

interface TasteProfile {
  /** Accumulated preference weight per mood tag. Positive = liked, negative = skipped. */
  moodScores: Record<string, number>;
  /** Accumulated preference weight per genre tag. */
  genreScores: Record<string, number>;
  recent48hLiked: Set<string>;
  recent48hReplayed: Set<string>;
  recent24hSkipped: Set<string>;
  recentlyPlayedIds: Set<string>;
  hasHistory: boolean;
}

function buildTasteProfile(logs: BehaviorLog[], allSongs: Song[]): TasteProfile {
  const now = Date.now();
  const MS_48H = 48 * 60 * 60 * 1000;
  const MS_24H = 24 * 60 * 60 * 1000;

  const profile: TasteProfile = {
    moodScores: {},
    genreScores: {},
    recent48hLiked: new Set(),
    recent48hReplayed: new Set(),
    recent24hSkipped: new Set(),
    recentlyPlayedIds: new Set(),
    hasHistory: logs.length > 0,
  };

  const songMap = new Map(allSongs.map(s => [s.id, s]));

  for (const log of logs) {
    const age = now - new Date(log.createdAt).getTime();
    const isRecent48h = age < MS_48H;
    const isRecent24h = age < MS_24H;

    if (isRecent48h) {
      if (!log.skipped) profile.recentlyPlayedIds.add(log.songId);
      if (log.liked) profile.recent48hLiked.add(log.songId);
      if (log.replays > 0) profile.recent48hReplayed.add(log.songId);
    }
    if (isRecent24h && log.skipped) profile.recent24hSkipped.add(log.songId);

    // Mood / genre preference accumulation
    const song = songMap.get(log.songId);
    if (!song) continue;

    let weight = 0;
    if (!log.skipped) {
      weight += Math.min(log.durationSeconds / 30, 3); // 0–3 for listen depth
      if (log.liked) weight += 5;
      weight += log.replays * 3;
    } else {
      weight = log.durationSeconds < 5 ? -2 : -0.5; // hard vs soft skip
    }

    if (weight !== 0) {
      for (const m of song.features.mood) {
        profile.moodScores[m] = (profile.moodScores[m] || 0) + weight;
      }
      for (const g of song.features.genre) {
        profile.genreScores[g] = (profile.genreScores[g] || 0) + weight;
      }
    }
  }

  return profile;
}

// ─── Stage 1: Candidate Generation ───────────────────────────────────────────

/**
 * Builds four pools and merges them into a deduplicated candidate set.
 *
 * Pool "taste"       – songs whose mood/genre tags have a positive preference
 *                      score, sorted by cumulative taste weight.
 * Pool "trending"    – songs with the highest recent-24h engagement velocity.
 * Pool "new"         – most recently uploaded songs.
 * Pool "exploration" – songs NOT already in the taste pool; serendipitous picks.
 *
 * A song can appear in more than one pool. Pool membership is tracked so Stage 2
 * can apply a consensus bonus to broadly-recommended songs.
 */
function generateCandidates(allSongs: Song[], profile: TasteProfile): Candidate[] {
  const map = new Map<string, Candidate>();

  function nominate(song: Song, pool: Pool) {
    const existing = map.get(song.id);
    if (existing) {
      existing.pools.push(pool);
    } else {
      map.set(song.id, { song, pools: [pool] });
    }
  }

  // ── Pool 1: Taste ──────────────────────────────────────────────────────────
  // Songs qualify for this pool when ANY single mood or genre tag has a
  // positive preference score (not a net sum — one strong match is enough).
  // Falls back to top-60%-by-engagement when the user has no history or when
  // no positive taste signal has accumulated yet (e.g. all listens were skips).
  let tasteSongs: Song[];

  if (profile.hasHistory) {
    const scoredByTaste = allSongs
      .map(s => ({
        song: s,
        // Use the MAX individual tag score rather than the sum so that a song
        // with one strongly-liked mood isn't dragged down by neutral/negative tags.
        bestTagScore: Math.max(
          ...s.features.mood.map(m => profile.moodScores[m] || 0),
          ...s.features.genre.map(g => profile.genreScores[g] || 0),
          0, // floor so Math.max never returns -Infinity on empty arrays
        ),
      }))
      .filter(({ bestTagScore }) => bestTagScore > 0)
      .sort((a, b) => b.bestTagScore - a.bestTagScore);

    tasteSongs = scoredByTaste.map(x => x.song)
      .slice(0, Math.max(1, Math.ceil(allSongs.length * 0.6)));
  } else {
    tasteSongs = []; // will hit fallback below
  }

  // Fallback: if history exists but all signals were negative/neutral (e.g. only
  // skips logged) or user is brand-new, use engagement-ranked top 60% as taste.
  if (tasteSongs.length === 0) {
    tasteSongs = [...allSongs]
      .sort((a, b) => _engagementScore(b) - _engagementScore(a))
      .slice(0, Math.max(1, Math.ceil(allSongs.length * 0.6)));
  }

  tasteSongs.forEach(s => nominate(s, "taste"));

  // ── Pool 2: Trending ───────────────────────────────────────────────────────
  // Top 50% by recent-24h engagement velocity.
  const trendingSongs = [...allSongs]
    .sort((a, b) => _trendingScore(b) - _trendingScore(a))
    .slice(0, Math.max(1, Math.ceil(allSongs.length * 0.5)));
  trendingSongs.forEach(s => nominate(s, "trending"));

  // ── Pool 3: New ────────────────────────────────────────────────────────────
  // Most recently uploaded songs (top 40% newest).
  const newSongs = [...allSongs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Math.max(1, Math.ceil(allSongs.length * 0.4)));
  newSongs.forEach(s => nominate(s, "new"));

  // ── Pool 4: Exploration ────────────────────────────────────────────────────
  // Songs NOT in the taste pool — forces serendipitous discovery.
  // We always derive exploration as the complement of the taste pool so that
  // every song appears in at least one pool and gets scored.
  const tasteSongIds = new Set(tasteSongs.map(s => s.id));
  const explorationSongs = allSongs.filter(s => !tasteSongIds.has(s.id));
  // If taste covers everything (small catalogue), fall back to the lowest-scored
  // third so users still get some variety.
  if (explorationSongs.length === 0) {
    [...allSongs]
      .sort((a, b) => _engagementScore(a) - _engagementScore(b))
      .slice(0, Math.max(1, Math.ceil(allSongs.length * 0.33)))
      .forEach(s => nominate(s, "exploration"));
  } else {
    explorationSongs.forEach(s => nominate(s, "exploration"));
  }

  return Array.from(map.values());
}

// ─── Stage 2: Scoring ─────────────────────────────────────────────────────────

/**
 * Session context score: how well does this song match the user's *right-now*
 * mood and energy, inferred from what they've actually listened to this session?
 *
 * Returns 0–100 (50 = no session / neutral).
 *
 * Signals used:
 *   +20 per matching session mood (up to 3 moods → +60)
 *   +15 per matching session genre (up to 3 genres → +45)
 *   +15 if energy matches the session's dominant energy
 *   +10 if song fits the session's energy drift direction
 *   -25 per session mood whose "opposite" moods include this song's mood
 *
 * The score is then clamped to [0, 100].
 */
function _sessionContextScore(song: Song, ctx: SessionContext | undefined): number {
  if (!ctx) return 50;

  const songMoods  = new Set(song.features.mood);
  const songGenres = new Set(song.features.genre);

  // ── Cold start: use onboarding prefs (bypass sessionLength guard) ──────────
  // First-time users have stated prefs but no listen history yet.
  if (ctx.isColdStart && ctx.onboardingPrefs) {
    let score = 20; // lower baseline so match bonuses stand out clearly
    for (const m of ctx.onboardingPrefs.moods) {
      if (songMoods.has(m)) score += 30; // strong boost per matching mood
    }
    for (const g of ctx.onboardingPrefs.genres) {
      if (songGenres.has(g)) score += 22; // strong boost per matching genre
    }
    return Math.max(0, Math.min(score, 100));
  }

  // ── Regular session: require at least 2 entries for meaningful signal ──────
  if (ctx.sessionLength < 2) return 50;

  let score = 50;

  for (const m of ctx.sessionMoods) {
    if (songMoods.has(m)) score += 20;
  }
  for (const g of ctx.sessionGenres) {
    if (songGenres.has(g)) score += 15;
  }
  if (song.features.energy === ctx.sessionEnergy) score += 15;
  if (ctx.energyDrift === "up"   && song.features.energy === "high") score += 10;
  if (ctx.energyDrift === "down" && song.features.energy === "low")  score += 10;

  for (const sessionMood of ctx.sessionMoods) {
    const opposites = OPPOSING_MOODS[sessionMood] ?? [];
    for (const opp of opposites) {
      if (songMoods.has(opp)) {
        score -= 25;
        break;
      }
    }
  }

  return Math.max(0, Math.min(score, 100));
}

/**
 * Negative preference adjustment: penalise songs that share moods/genres with
 * songs the user has skipped this session. Aggressive suppression so the feed
 * stops showing more of what the user clearly doesn't want.
 *
 * Returns a negative number (0 to -70).
 */
function _negativePreferenceAdjustment(song: Song, ctx: SessionContext | undefined): number {
  if (!ctx?.negativePreferences) return 0;
  const { moods, genres } = ctx.negativePreferences;
  let penalty = 0;
  for (const m of song.features.mood) {
    penalty += (moods[m] || 0) * 18;
  }
  for (const g of song.features.genre) {
    penalty += (genres[g] || 0) * 14;
  }
  return -Math.min(penalty, 70);
}

/**
 * Replay boost adjustment: reward songs that share moods/genres with songs the
 * user replayed this session. Gives the user more of what they loved.
 *
 * Returns a positive number (0 to +40).
 */
function _replayBoostAdjustment(song: Song, ctx: SessionContext | undefined): number {
  if (!ctx?.replayBoosts) return 0;
  const { moods, genres } = ctx.replayBoosts;
  let boost = 0;
  for (const m of song.features.mood) {
    boost += (moods[m] || 0) * 15;
  }
  for (const g of song.features.genre) {
    boost += (genres[g] || 0) * 12;
  }
  return Math.min(boost, 40);
}

/**
 * Engagement quality: how good is the song based on real listen + reaction data?
 * Sources: features.popularity (plays, completions, replays, likes, shares) + raw DB counts.
 * Returns 0–100.
 */
function _engagementScore(song: Song): number {
  const pop = song.features.popularity;
  let score = 0;

  if (pop.plays > 0) {
    const completionRate = Math.min(pop.completions / pop.plays, 1);
    const replayRate     = Math.min(pop.replays    / pop.plays, 0.5) / 0.5;
    const likeRate       = Math.min(pop.likes      / pop.plays, 0.3) / 0.3;
    const shareRate      = Math.min(pop.shares     / pop.plays, 0.1) / 0.1;
    const logVolume      = Math.min(Math.log10(pop.plays + 1) / 5, 1);

    score = completionRate * 35 + replayRate * 25 + likeRate * 20 + shareRate * 15 + logVolume * 5;
  }

  // Blend in raw DB counts for songs with sparse feature-level data
  const rawBonus = Math.min((song.likes * 2 + song.saves * 3 + song.shares * 5) / 100, 25);
  return Math.min(score + rawBonus, 100);
}

/**
 * Trending / momentum: is the song blowing up *right now*?
 * Compares recent-24h engagement rates vs estimated historical baseline.
 * Returns 0–100.
 */
function _trendingScore(song: Song): number {
  const pop    = song.features.popularity;
  const recent = pop.recent24h;
  if (recent.plays === 0) return 0;

  const recentLikeRate   = recent.likes    / recent.plays;
  const recentReplayRate = recent.replays  / recent.plays;
  const recentCommentRate = recent.comments / recent.plays;

  // Velocity: how much faster is growth now vs the historical daily average?
  const historicalDailyRate = Math.max((pop.plays - recent.plays) / 30, 1);
  const velocityBonus = Math.min((recent.plays / historicalDailyRate) * 10, 50);

  return Math.min(
    recentLikeRate * 40 + recentReplayRate * 40 + recentCommentRate * 20 + velocityBonus,
    100
  );
}

/**
 * Taste similarity: how well does this song match the user's learned preferences?
 * Uses accumulated mood/genre weights, normalised against the user's top score.
 * Returns 0–100. Returns 50 (neutral) for new users with no history.
 */
function _tasteSimilarityScore(song: Song, profile: TasteProfile): number {
  if (!profile.hasHistory) return 50;

  const moodVals  = Object.values(profile.moodScores);
  const genreVals = Object.values(profile.genreScores);
  const maxMood   = moodVals.length  > 0 ? Math.max(...moodVals,  1) : 1;
  const maxGenre  = genreVals.length > 0 ? Math.max(...genreVals, 1) : 1;

  let score = 0;
  for (const m of song.features.mood) {
    score += ((profile.moodScores[m]  || 0) / maxMood)  * 60;
  }
  for (const g of song.features.genre) {
    score += ((profile.genreScores[g] || 0) / maxGenre) * 40;
  }
  return Math.max(0, Math.min(score, 100));
}

/**
 * Recency / freshness: newer songs surface more prominently.
 * Decays from 100 (just uploaded) to ~0 after 90 days.
 * Returns 0–100.
 */
function _recencyScore(song: Song): number {
  const ageDays = (Date.now() - new Date(song.createdAt).getTime()) / 86_400_000;
  return Math.max(0, 100 - (ageDays / 90) * 100);
}

/**
 * Recent behaviour adjustment: did the user interact with this song in the
 * last 24–48 hours? Positive signals boost, negative signals penalise.
 * Returns 0–100 (50 = neutral / no signal).
 */
function _recentBehaviorScore(song: Song, profile: TasteProfile): number {
  let score = 50; // neutral baseline
  if (profile.recent48hLiked.has(song.id))    score += 40;
  if (profile.recent48hReplayed.has(song.id)) score += 35;
  if (profile.recentlyPlayedIds.has(song.id)) score -= 20; // heard recently → mild suppression
  if (profile.recent24hSkipped.has(song.id))  score -= 60; // just skipped → strong suppression
  return Math.max(0, Math.min(score, 100));
}

/**
 * Time-of-day context: does the song's mood fit the current hour?
 * Returns 0 or 100 (binary on/off boost).
 */
function _timeOfDayScore(song: Song, hour: number): number {
  const moods    = new Set(song.features.mood);
  const isNight  = hour >= 21 || hour < 5;
  const isMorn   = hour >= 5  && hour < 12;
  const isAfter  = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 21;

  if (isNight   && (moods.has("Night Drive") || moods.has("Chill") || moods.has("Sad")))  return 100;
  if (isMorn    && (moods.has("Focus") || moods.has("Study") || moods.has("Hype")))        return 100;
  if (isAfter   && (moods.has("Hype") || song.features.energy === "high"))                 return 100;
  if (isEvening && (moods.has("Chill") || song.features.energy === "medium"))              return 100;
  return 0;
}

/**
 * Stage 2: compute the composite relevance score for a single candidate.
 *
 * Weights:
 *   Engagement     35%  – quality signal from play/reaction data
 *   Taste          30%  – personalised preference match
 *   Recent behav.  15%  – short-term user signals
 *   Recency        10%  – freshness / upload age
 *   Time of day     5%  – contextual hour match
 *
 * Plus a flat pool-consensus bonus: songs nominated by multiple pools are
 * considered high-confidence recommendations (+10 pts per extra pool, capped at +20).
 */
function scoreCandidate(candidate: Candidate, profile: TasteProfile, hour: number): number {
  const { song, pools } = candidate;

  const engagement   = _engagementScore(song);
  const taste        = _tasteSimilarityScore(song, profile);
  const recency      = _recencyScore(song);
  const recentBehav  = _recentBehaviorScore(song, profile);
  const timeOfDay    = _timeOfDayScore(song, hour);

  // Bonus for appearing in multiple pools (cross-pool consensus)
  const poolBonus = Math.min((pools.length - 1) * 10, 20);

  return (
    engagement  * 0.35 +
    taste       * 0.30 +
    recentBehav * 0.15 +
    recency     * 0.10 +
    timeOfDay   * 0.05 +
    poolBonus
  );
}

// ─── Stage 3: Ranking & Diversity ─────────────────────────────────────────────

/**
 * Greedy MMR diversity pass.
 *
 * Sorts candidates by descending score, then re-orders them so that the final
 * feed never places the same artist in the last `artistWindow` positions or
 * accumulates too many overlapping mood tags within `moodWindow` positions.
 *
 * This avoids "artist clumping" even when the user strongly prefers one artist,
 * and prevents a feed that feels tonally monotonous.
 */
function applyDiversityRanking(
  candidates: { candidate: Candidate; score: number }[],
  artistWindow = 3,
  moodWindow   = 4
): { candidate: Candidate; score: number }[] {
  // Initial sort (relevance order for tie-breaking inside each MMR step)
  const pool = [...candidates].sort((a, b) => b.score - a.score);

  const result: typeof pool = [];
  const placed    = new Set<string>();
  const recentArtists: string[] = [];
  const recentMoods:   string[] = [];

  while (placed.size < pool.length) {
    let bestIdx   = -1;
    let bestFinal = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const item = pool[i];
      if (placed.has(item.candidate.song.id)) continue;

      const { song } = item.candidate;

      // Artist diversity penalty
      const artistPenalty = recentArtists.slice(-artistWindow).includes(song.artist) ? 30 : 0;

      // Mood diversity penalty (each overlapping mood costs points)
      const recentMoodSet = new Set(recentMoods.slice(-(moodWindow * 3)));
      const moodPenalty   = song.features.mood.filter(m => recentMoodSet.has(m)).length * 10;

      const finalScore = item.score - artistPenalty - moodPenalty;
      if (finalScore > bestFinal) {
        bestFinal = finalScore;
        bestIdx   = i;
      }
    }

    if (bestIdx < 0) break;

    const winner = pool[bestIdx];
    result.push(winner);
    placed.add(winner.candidate.song.id);
    recentArtists.push(winner.candidate.song.artist);
    for (const m of winner.candidate.song.features.mood) recentMoods.push(m);
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RankedSong extends Song {
  /** Final composite score (0–100+). */
  _score: number;
  /** Score component breakdown for debugging / transparency. */
  _scoreBreakdown: {
    engagement: number;
    taste: number;
    sessionContext: number;
    recentBehavior: number;
    recency: number;
    timeOfDay: number;
    poolBonus: number;
    distributionMultiplier: number;
  };
  /** Which candidate pools nominated this song. */
  _pools: Pool[];
  /** Discovery distribution phase (test / growth / broad / full / suppressed). */
  _distributionPhase: string;
}

/**
 * Main entry point. Runs the full three-stage pipeline and returns songs
 * ordered for the feed, annotated with score metadata.
 *
 * @param allSongs    Full catalogue from the database.
 * @param logs        Behaviour logs for the requesting user.
 * @param sessionCtx  Optional real-time session context sent by the client.
 *                    When provided, the 6th scoring component (session context,
 *                    20% weight) activates and dynamically boosts songs that
 *                    match the user's current session mood/energy.
 * @returns           Songs ordered by relevance + diversity, with `_score` etc.
 */
export function rankSongsForUser(
  allSongs:    Song[],
  logs:        BehaviorLog[],
  sessionCtx?: SessionContext
): RankedSong[] {
  const hour    = new Date().getHours();
  const profile = buildTasteProfile(logs, allSongs);

  // ── Stage 1: Candidate Generation (with Discovery Distribution Gate) ────────
  // Apply a probabilistic gate so new / test-phase songs only appear in a
  // fraction of feeds, proportional to their distributionScore (0–100).
  // Songs at 100 always pass. Songs at 10 pass ~10% of the time.
  // A minimum number of songs always pass to prevent empty feeds.
  const gatedIds   = applyDistributionGate(
    allSongs.map(s => ({ id: s.id, distributionScore: s.distributionScore })),
    Math.min(4, allSongs.length) // always keep at least 4 songs
  );
  const gatedSongs = allSongs.filter(s => gatedIds.has(s.id));

  const candidates = generateCandidates(gatedSongs, profile);

  // ── Stage 2: Scoring ───────────────────────────────────────────────────────
  //
  // Weight breakdown (sums to 100%):
  //   Engagement quality  30%   – play / reaction data quality
  //   Taste similarity    25%   – long-term preference match
  //   Session context     20%   – real-time mood / energy match (this session)
  //   Recent behaviour    15%   – short-term like / skip signals
  //   Recency / freshness  7%   – upload age decay
  //   Time of day          3%   – hour-based mood context
  //   + flat pool-consensus bonus
  const isColdStart = sessionCtx?.isColdStart ?? false;

  const scored = candidates.map(candidate => {
    const { song, pools } = candidate;

    const engagement   = _engagementScore(song);
    const taste        = _tasteSimilarityScore(song, profile);
    const session      = _sessionContextScore(song, sessionCtx);
    const recency      = _recencyScore(song);
    const recentBehav  = _recentBehaviorScore(song, profile);
    const timeOfDay    = _timeOfDayScore(song, hour);
    const poolBonus    = Math.min((pools.length - 1) * 10, 20);
    const negAdj       = _negativePreferenceAdjustment(song, sessionCtx);
    const repAdj       = _replayBoostAdjustment(song, sessionCtx);

    // Distribution multiplier: suppressed songs rank lower.
    const distMult = Math.pow(song.distributionScore / 100, 0.6);

    let rawScore: number;

    if (isColdStart) {
      // Cold start: heavily favour session context (onboarding prefs) so the
      // very first feed feels immediately relevant to what the user stated.
      rawScore = (
        engagement  * 0.25 +
        taste       * 0.05 +
        session     * 0.55 +
        recency     * 0.10 +
        timeOfDay   * 0.05 +
        poolBonus
      );
    } else {
      rawScore = (
        engagement  * 0.30 +
        taste       * 0.25 +
        session     * 0.20 +
        recentBehav * 0.15 +
        recency     * 0.07 +
        timeOfDay   * 0.03 +
        poolBonus
      );
    }

    // Apply session-level negative and replay adjustments on top of raw score.
    rawScore = rawScore + negAdj + repAdj;

    const score = Math.max(0, rawScore) * distMult;

    return {
      candidate,
      score,
      breakdown: {
        engagement:             Math.round(engagement  * 10) / 10,
        taste:                  Math.round(taste       * 10) / 10,
        sessionContext:         Math.round(session     * 10) / 10,
        recentBehavior:         Math.round(recentBehav * 10) / 10,
        recency:                Math.round(recency     * 10) / 10,
        timeOfDay,
        poolBonus,
        distributionMultiplier: Math.round(distMult * 100) / 100,
      },
    };
  });

  // ── Stage 3: Ranking & Diversity ───────────────────────────────────────────
  const ranked = applyDiversityRanking(
    scored.map(s => ({ candidate: s.candidate, score: s.score }))
  );

  // Re-attach breakdown data and build the final annotated list
  const breakdownMap = new Map(scored.map(s => [s.candidate.song.id, s.breakdown]));

  return ranked.map(({ candidate, score }) => ({
    ...candidate.song,
    _score:             Math.round(score * 100) / 100,
    _scoreBreakdown:    breakdownMap.get(candidate.song.id)!,
    _pools:             candidate.pools,
    _distributionPhase: candidate.song.distributionPhase,
  }));
}

import type { Song, BehaviorLog } from "@shared/schema";

// ─── Taste Profile ────────────────────────────────────────────────────────────

interface TasteProfile {
  moodScores: Record<string, number>;
  genreScores: Record<string, number>;
  likedIds: Set<string>;
  replayedIds: Set<string>;
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
    likedIds: new Set(),
    replayedIds: new Set(),
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

    if (log.liked) profile.likedIds.add(log.songId);
    if (log.replays > 0) profile.replayedIds.add(log.songId);

    if (isRecent48h) {
      if (!log.skipped) profile.recentlyPlayedIds.add(log.songId);
      if (log.liked) profile.recent48hLiked.add(log.songId);
      if (log.replays > 0) profile.recent48hReplayed.add(log.songId);
    }
    if (isRecent24h && log.skipped) profile.recent24hSkipped.add(log.songId);

    // Accumulate mood/genre preference weights
    const song = songMap.get(log.songId);
    if (!song) continue;

    // Weight: positive for engagement, negative for early skips
    let weight = 0;
    if (!log.skipped) {
      weight += Math.min(log.durationSeconds / 30, 3); // 0-3 pts for listen time
      if (log.liked) weight += 5;
      weight += log.replays * 3;
    } else if (log.durationSeconds < 5) {
      weight = -2; // Immediate skip is a strong dislike signal
    } else {
      weight = -0.5; // Late skip is a mild dislike
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

// ─── Component Scorers ────────────────────────────────────────────────────────

/**
 * Score 0-100: how well this song matches the user's taste profile.
 * Uses accumulated mood + genre preference weights, normalized to 0-100.
 */
function scoreTasteSimilarity(song: Song, profile: TasteProfile): number {
  if (!profile.hasHistory) return 50; // Cold start: neutral

  const moodValues = Object.values(profile.moodScores);
  const genreValues = Object.values(profile.genreScores);
  const maxMood = moodValues.length > 0 ? Math.max(...moodValues, 1) : 1;
  const maxGenre = genreValues.length > 0 ? Math.max(...genreValues, 1) : 1;

  let tasteScore = 0;
  for (const m of song.features.mood) {
    const s = profile.moodScores[m] || 0;
    tasteScore += (s / maxMood) * 60; // Each mood match contributes up to 60 pts
  }
  for (const g of song.features.genre) {
    const s = profile.genreScores[g] || 0;
    tasteScore += (s / maxGenre) * 40; // Each genre match contributes up to 40 pts
  }

  return Math.max(0, Math.min(tasteScore, 100));
}

/**
 * Score 0-100: adjust based on recent (last 24-48h) listening signals.
 * Penalizes skipped songs, rewards songs the user engaged with recently.
 */
function scoreRecentBehavior(song: Song, profile: TasteProfile): number {
  let score = 50; // Neutral baseline

  if (profile.recent48hLiked.has(song.id)) score += 40;
  if (profile.recent48hReplayed.has(song.id)) score += 35;
  if (profile.recentlyPlayedIds.has(song.id)) score -= 15; // Heard recently = mild penalty
  if (profile.recent24hSkipped.has(song.id)) score -= 60; // Just skipped = strong penalty

  // Also boost songs similar in mood to what was liked in last 48h — indirect signal
  if (profile.hasHistory) {
    // noop - handled by taste similarity, which weights recent logs equally
  }

  return Math.max(0, Math.min(score, 100));
}

/**
 * Score 0-100: pure engagement quality of the song itself.
 * Uses completion rate, replay rate, like rate, share rate from the features blob + raw DB counts.
 */
function scoreEngagement(song: Song): number {
  const pop = song.features.popularity;
  let engScore = 0;

  if (pop.plays > 0) {
    const completionRate = Math.min(pop.completions / pop.plays, 1);
    const replayRate = Math.min(pop.replays / pop.plays, 0.5) / 0.5; // normalize to 50% cap
    const likeRate = Math.min(pop.likes / pop.plays, 0.3) / 0.3;    // normalize to 30% cap
    const shareRate = Math.min(pop.shares / pop.plays, 0.1) / 0.1;  // normalize to 10% cap
    const logVolume = Math.min(Math.log10(pop.plays + 1) / 5, 1);   // log-scaled volume bonus

    engScore = completionRate * 35 +
               replayRate * 25 +
               likeRate * 20 +
               shareRate * 15 +
               logVolume * 5;
  }

  // Blend in raw DB engagement counts for songs with very few feature-tracked plays
  const rawBonus = Math.min(
    (song.likes * 2 + song.saves * 3 + song.shares * 5) / 100,
    25
  );

  return Math.min(engScore + rawBonus, 100);
}

/**
 * Score 0-100: trending momentum based on recent24h engagement velocity.
 * Compares recent rate vs estimated historical rate to find "blowing up" songs.
 */
function scoreTrending(song: Song): number {
  const pop = song.features.popularity;
  const recent = pop.recent24h;

  if (recent.plays === 0) return 0;

  const recentLikeRate = recent.likes / recent.plays;
  const recentReplayRate = recent.replays / recent.plays;
  const recentCommentRate = recent.comments / recent.plays;

  // Velocity: how much faster is it growing now vs. historical baseline?
  const historicalRate = Math.max((pop.plays - recent.plays) / 30, 1); // fake 30-day baseline
  const velocityBonus = Math.min((recent.plays / historicalRate) * 10, 50);

  const score = recentLikeRate * 40 + recentReplayRate * 40 + recentCommentRate * 20 + velocityBonus;
  return Math.min(score, 100);
}

/**
 * Score 0 or 100: time-of-day mood match bonus.
 */
function scoreTimeOfDay(song: Song, hour: number): number {
  const moods = new Set(song.features.mood);
  const isNight = hour >= 21 || hour < 5;
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 21;

  if (isNight && (moods.has("Night Drive") || moods.has("Chill") || moods.has("Sad"))) return 100;
  if (isMorning && (moods.has("Focus") || moods.has("Study") || moods.has("Hype"))) return 100;
  if (isAfternoon && (moods.has("Hype") || song.features.energy === "high")) return 100;
  if (isEvening && (moods.has("Chill") || song.features.energy === "medium")) return 100;
  return 0;
}

/**
 * Compute the composite relevance score for a single song.
 * Weights:  taste 30% | recent behavior 25% | engagement 25% | trending 15% | time 5%
 */
function computeRelevanceScore(song: Song, profile: TasteProfile, hour: number): number {
  const taste = scoreTasteSimilarity(song, profile);
  const recent = scoreRecentBehavior(song, profile);
  const engagement = scoreEngagement(song);
  const trending = scoreTrending(song);
  const timeOfDay = scoreTimeOfDay(song, hour);

  return (
    taste * 0.30 +
    recent * 0.25 +
    engagement * 0.25 +
    trending * 0.15 +
    timeOfDay * 0.05
  );
}

// ─── Diversity-Aware Ranking (MMR) ───────────────────────────────────────────

/**
 * Greedy Maximal Marginal Relevance pass.
 *
 * After initial scoring we don't just sort by score — we iteratively pick the
 * best song while applying a sliding-window penalty for same artist or same mood
 * that already appeared in the last `windowSize` slots.
 *
 * This ensures the feed feels varied even when a user loves one genre/artist.
 */
function applyDiversityRanking(
  songs: Song[],
  relevanceScores: Map<string, number>,
  artistWindow = 3,
  moodWindow = 4
): Song[] {
  // Start with a relevance-sorted list for tie-breaking
  const pool = songs.slice().sort(
    (a, b) => (relevanceScores.get(b.id) || 0) - (relevanceScores.get(a.id) || 0)
  );

  const result: Song[] = [];
  const placed = new Set<string>();
  const recentArtists: string[] = [];
  const recentMoods: string[] = [];

  while (placed.size < pool.length) {
    let bestId: string | null = null;
    let bestFinal = -Infinity;

    for (const song of pool) {
      if (placed.has(song.id)) continue;

      const base = relevanceScores.get(song.id) || 0;

      // Artist diversity: penalize if this artist appeared in the last `artistWindow` songs
      const artistPenalty = recentArtists.slice(-artistWindow).includes(song.artist) ? 30 : 0;

      // Mood diversity: penalize each overlapping mood from the recent `moodWindow` selections
      const recentMoodSet = new Set(recentMoods.slice(-moodWindow * song.features.mood.length));
      const moodOverlap = song.features.mood.filter(m => recentMoodSet.has(m)).length;
      const moodPenalty = moodOverlap * 10;

      const finalScore = base - artistPenalty - moodPenalty;
      if (finalScore > bestFinal) {
        bestFinal = finalScore;
        bestId = song.id;
      }
    }

    if (!bestId) break;

    const winner = pool.find(s => s.id === bestId)!;
    result.push(winner);
    placed.add(winner.id);
    recentArtists.push(winner.artist);
    for (const m of winner.features.mood) recentMoods.push(m);
  }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RankedSong extends Song {
  _score: number;
  _scoreBreakdown: {
    taste: number;
    recentBehavior: number;
    engagement: number;
    trending: number;
    timeOfDay: number;
  };
}

/**
 * Main entry point: rank all songs for a given user.
 *
 * Steps:
 *  1. Build taste profile from behavior logs
 *  2. Compute relevance score for every song (taste + recent + engagement + trending + time)
 *  3. Apply greedy MMR diversity pass to avoid artist/mood clumping
 *  4. Return sorted songs with _score annotation for debugging
 */
export function rankSongsForUser(allSongs: Song[], logs: BehaviorLog[]): RankedSong[] {
  const hour = new Date().getHours();
  const profile = buildTasteProfile(logs, allSongs);

  // Score every song
  const relevanceScores = new Map<string, number>();
  const breakdowns = new Map<string, RankedSong["_scoreBreakdown"]>();

  for (const song of allSongs) {
    const taste = scoreTasteSimilarity(song, profile);
    const recent = scoreRecentBehavior(song, profile);
    const engagement = scoreEngagement(song);
    const trending = scoreTrending(song);
    const timeOfDay = scoreTimeOfDay(song, hour);

    const total = taste * 0.30 + recent * 0.25 + engagement * 0.25 + trending * 0.15 + timeOfDay * 0.05;

    relevanceScores.set(song.id, total);
    breakdowns.set(song.id, {
      taste: Math.round(taste * 10) / 10,
      recentBehavior: Math.round(recent * 10) / 10,
      engagement: Math.round(engagement * 10) / 10,
      trending: Math.round(trending * 10) / 10,
      timeOfDay,
    });
  }

  // Diversity-aware ordering
  const ordered = applyDiversityRanking(allSongs, relevanceScores);

  // Annotate with scores for transparency
  return ordered.map(song => ({
    ...song,
    _score: Math.round((relevanceScores.get(song.id) || 0) * 100) / 100,
    _scoreBreakdown: breakdowns.get(song.id)!,
  }));
}

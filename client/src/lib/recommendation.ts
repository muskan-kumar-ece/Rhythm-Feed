import { Song } from "./dummyData";
import { ApiSong } from "./api";
import { behaviorLogs } from "./tracking";

// Allow either the old local Song type or the new ApiSong type
type AnySong = Song | ApiSong;

// Shared pool of songs loaded from API - updated by Feed when songs are fetched
let _songsPool: AnySong[] = [];
export function setSongsPool(songs: AnySong[]) {
  _songsPool = songs;
}
function getSongsPool(): AnySong[] {
  return _songsPool;
}

// Mock database of other users' listening behaviors to simulate collaborative filtering
const mockOtherUsersBehavior = [
  { userId: 'u1', likes: ['1', '3'], replays: ['1'] },
  { userId: 'u2', likes: ['2', '4'], replays: ['2', '4'] },
  { userId: 'u3', likes: ['1', '2'], replays: ['2'] },
  { userId: 'u4', likes: ['3', '4'], replays: ['3'] },
  { userId: 'u5', likes: ['1', '4'], replays: ['1'] },
  { userId: 'u6', likes: ['2', '3'], replays: ['3'] },
];

/**
 * Calculates a dynamic viral score based on engagement metrics.
 * Uses a weighted algorithm to determine how "hot" a song is.
 */
export function calculateViralScore(song: Song): number {
  const pop = song.features.popularity;
  
  // Guard against divide by zero
  if (pop.plays === 0) return 0;

  // Calculate rates
  const completionRate = pop.completions / pop.plays;
  const replayRate = pop.replays / pop.plays;
  const likeRate = pop.likes / pop.plays;
  const commentRate = song.comments / pop.plays;
  const shareRate = song.shares / pop.plays;

  // Weighted Viral Formula
  // Shares are highest value, followed by completion & replays
  let score = 0;
  score += completionRate * 30; // Max 30 points
  score += replayRate * 25;     // Max 25 points
  score += shareRate * 25;      // Max 25 points
  score += likeRate * 15;       // Max 15 points
  score += commentRate * 5;     // Max 5 points
  
  // Velocity multiplier: boost score based on raw play volume to prevent 
  // 1-play songs with 1-share from dominating
  const volumeMultiplier = Math.min(1 + (Math.log10(pop.plays + 1) * 0.1), 1.5);

  return Math.min(score * volumeMultiplier * 100, 100); // Scale to 0-100
}

/**
 * Calculates a momentum/trending score based on engagement velocity in the last 24 hours.
 */
export function calculateTrendingScore(song: Song): number {
  const recent = song.features.popularity.recent24h;
  const total = song.features.popularity;

  if (recent.plays === 0) return 0;

  // Recent engagement rates
  const recentLikeRate = recent.likes / recent.plays;
  const recentReplayRate = recent.replays / recent.plays;
  const recentCommentRate = recent.comments / recent.plays;

  // Compare recent velocity vs historical velocity (Is it blowing up right now?)
  // If total plays is 0, velocity is high.
  const historicalPlayRate = total.plays > recent.plays ? (total.plays - recent.plays) / 30 : 1; // fake historical 30 days
  const playVelocity = recent.plays / Math.max(historicalPlayRate, 1);

  // Score based on recent rates and play velocity
  let score = (recentLikeRate * 40) + (recentReplayRate * 40) + (recentCommentRate * 20);
  
  // Add velocity bonus
  const velocityBonus = Math.min(playVelocity * 10, 50); // Cap velocity bonus at 50
  
  return score + velocityBonus;
}

/**
 * Calculates a collaborative filtering score based on similar users' behaviors.
 */
function calculateCollaborativeScore(
  targetSongId: string, 
  currentUserLikedIds: string[], 
  currentUserReplayedIds: string[]
): number {
  let score = 0;
  
  // Find users who have similar taste
  mockOtherUsersBehavior.forEach(otherUser => {
    let similarity = 0;
    
    // They liked the same songs
    const commonLikes = otherUser.likes.filter(id => currentUserLikedIds.includes(id));
    similarity += commonLikes.length * 2;
    
    // They replayed the same songs
    const commonReplays = otherUser.replays.filter(id => currentUserReplayedIds.includes(id));
    similarity += commonReplays.length * 3;
    
    // If they have similar taste, and they engaged with the TARGET song
    // we boost the target song's score proportionally to the user similarity
    if (similarity > 0) {
      if (otherUser.likes.includes(targetSongId)) {
        score += similarity * 5;
      }
      if (otherUser.replays.includes(targetSongId)) {
        score += similarity * 8;
      }
    }
  });
  
  // Normalize score to 0-100 range roughly
  return Math.min(score, 100);
}

/**
 * A mock recommendation engine that generates a feed segment based on:
 * - Personalized: User's listening history
 * - Collaborative: Similar users' preferences
 * - Viral/Trending: Songs with the highest dynamic viral score
 * - Rapid Momentum: Songs actively trending in the last 24 hours
 * - New: Recently uploaded songs
 * - Random: Serendipitous discovery
 */
export function generateFeedSegment(): AnySong[] {
  const allSongs = getSongsPool();
  if (allSongs.length === 0) return [];

  // 1. Build User Taste Profile from Behavior Logs
  const moodScores: Record<string, number> = {};
  const currentUserLikedIds: string[] = [];
  const currentUserReplayedIds: string[] = [];
  
  if (behaviorLogs.length > 0) {
    behaviorLogs.forEach(log => {
      if (log.liked && !currentUserLikedIds.includes(log.songId)) {
        currentUserLikedIds.push(log.songId);
      }
      if (log.replays > 0 && !currentUserReplayedIds.includes(log.songId)) {
        currentUserReplayedIds.push(log.songId);
      }

      const song = allSongs.find(s => s.id === log.songId);
      if (song) {
        let score = 0;
        if (!log.skipped && log.durationSeconds > 30) score += 2; 
        if (log.skipped && log.durationSeconds < 5) score -= 2;   
        if (log.liked) score += 5;
        score += (log.replays * 3);
        song.features.mood.forEach((m: string) => {
          moodScores[m] = (moodScores[m] || 0) + score;
        });
      }
    });
  }

  // 2. Define our song pools
  const rapidTrendingPool = [...allSongs].sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
  const newPool = [...allSongs].reverse();
  const hasHistory = Object.keys(moodScores).length > 0;
  
  // Calculate dynamic ranking score for every song to build the personalized pool
  const personalizedPool = [...allSongs].map(song => {
    let score = 0;
    
    if (hasHistory) {
      let tasteMatch = 0;
      song.features.mood.forEach((m: string) => {
        if (moodScores[m]) tasteMatch += moodScores[m] * 5; 
      });
      score += Math.min(tasteMatch, 100) * 0.3;
      const collabScore = calculateCollaborativeScore(song.id, currentUserLikedIds, currentUserReplayedIds);
      score += collabScore * 0.25;
    }

    score += calculateViralScore(song) * 0.25;
    score += Math.min(calculateTrendingScore(song), 100) * 0.15;

    const hour = new Date().getHours();
    let timeBonus = 0;
    const isNight = hour >= 21 || hour < 5;
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;

    if (isNight && (song.features.mood.includes('Night Drive') || song.features.mood.includes('Chill') || song.features.mood.includes('Sad'))) {
      timeBonus = 100;
    } else if (isMorning && (song.features.mood.includes('Focus') || song.features.mood.includes('Study'))) {
      timeBonus = 100;
    } else if (isAfternoon && (song.features.mood.includes('Hype') || song.features.energy === 'high')) {
      timeBonus = 100;
    } else if (isEvening && song.features.energy === 'medium') {
      timeBonus = 100;
    }
    score += timeBonus * 0.05;

    return { song, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.song);

  const pickFromPool = (pool: AnySong[], typePrefix: string, useTopHalf: boolean = false): AnySong => {
    const source = pool.length > 0 ? pool : allSongs;
    let item: AnySong;
    if (useTopHalf) {
      const topHalfLimit = Math.max(1, Math.ceil(source.length / 2));
      item = source[Math.floor(Math.random() * topHalfLimit)];
    } else {
      item = source[Math.floor(Math.random() * source.length)];
    }
    return { ...item, id: `${item.id}-${typePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` };
  };

  const segment: AnySong[] = [];
  segment.push(pickFromPool(personalizedPool, 'rank-1', true)); 
  segment.push(pickFromPool(personalizedPool, 'rank-2', true)); 
  segment.push(pickFromPool(rapidTrendingPool, 'rapid-trend', true));
  segment.push(pickFromPool(allSongs, 'discover'));
  segment.push(pickFromPool(personalizedPool, 'rank-3', true));
  segment.push(pickFromPool(newPool, 'new'));

  return segment;
}

export function generateMoodFeedSegment(targetMood: string): AnySong[] {
  const allSongs = getSongsPool();
  if (allSongs.length === 0) return [];

  const moodPool = allSongs.filter(song => song.features.mood.includes(targetMood));
  const sourcePool = moodPool.length > 0 ? moodPool : allSongs;
  const sortedPool = [...sourcePool].sort((a, b) => calculateViralScore(b) - calculateViralScore(a));

  const segment: AnySong[] = [];
  for (let i = 0; i < 5; i++) {
    const poolLimit = Math.max(1, Math.ceil(sortedPool.length * 0.7));
    const item = sortedPool[Math.floor(Math.random() * poolLimit)];
    segment.push({ 
      ...item, 
      id: `${item.id}-mood-${targetMood}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` 
    });
  }

  return segment;
}
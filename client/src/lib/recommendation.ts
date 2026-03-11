import { Song, dummySongs } from "./dummyData";
import { behaviorLogs } from "./tracking";

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
 * Calculates a similarity score between a user's taste profile and a song's features.
 */
function calculateTasteMatchScore(song: Song, preferredMoods: Record<string, number>): number {
  let score = 0;
  
  // 1. Mood Matching (Heavy weight)
  song.features.mood.forEach(m => {
    if (preferredMoods[m]) {
      score += preferredMoods[m] * 2; 
    }
  });

  // 2. Base Popularity / Viral potential (Acts as a tiebreaker)
  const viralScore = calculateViralScore(song);
  score += (viralScore * 0.1); 

  // 3. Trending boost (If it's gaining rapid momentum, we push it slightly out of their comfort zone)
  const trendingScore = calculateTrendingScore(song);
  score += (trendingScore * 0.15);

  return score;
}

/**
 * A mock recommendation engine that generates a feed segment based on:
 * - Personalized: User's listening history
 * - Viral/Trending: Songs with the highest dynamic viral score
 * - Rapid Momentum: Songs actively trending in the last 24 hours
 * - New: Recently uploaded songs
 * - Random: Serendipitous discovery
 */
export function generateFeedSegment(): Song[] {
  // 1. Build User Taste Profile from Behavior Logs
  const moodScores: Record<string, number> = {};
  
  if (behaviorLogs.length > 0) {
    behaviorLogs.forEach(log => {
      const song = dummySongs.find(s => s.id === log.songId);
      if (song) {
        let score = 0;
        
        if (!log.skipped && log.durationSeconds > 30) score += 2; 
        if (log.skipped && log.durationSeconds < 5) score -= 2;   
        
        if (log.liked) score += 5;
        score += (log.replays * 3);
        
        song.features.mood.forEach(m => {
          moodScores[m] = (moodScores[m] || 0) + score;
        });
      }
    });
  }

  // 2. Define our song pools
  
  // Viral: Sort by our dynamic viral score
  const viralPool = [...dummySongs].sort((a, b) => calculateViralScore(b) - calculateViralScore(a));
  
  // Rapid Trending: Sort by 24h momentum
  const rapidTrendingPool = [...dummySongs].sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
  
  const newPool = [...dummySongs].reverse();

  const hasHistory = Object.keys(moodScores).length > 0;
  
  const personalizedPool = [...dummySongs].sort((a, b) => {
    if (!hasHistory) return calculateViralScore(b) - calculateViralScore(a);
    const scoreA = calculateTasteMatchScore(a, moodScores);
    const scoreB = calculateTasteMatchScore(b, moodScores);
    return scoreB - scoreA;
  });

  const randomPool = [...dummySongs];

  const pickFromPool = (pool: Song[], typePrefix: string, useTopHalf: boolean = false): Song => {
    const source = pool.length > 0 ? pool : dummySongs;
    
    let item;
    if (useTopHalf) {
      const topHalfLimit = Math.max(1, Math.ceil(source.length / 2));
      item = source[Math.floor(Math.random() * topHalfLimit)];
    } else {
      item = source[Math.floor(Math.random() * source.length)];
    }

    return { ...item, id: `${item.id}-${typePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` };
  };

  // 3. Construct a blended segment (6 songs to include rapid trending)
  const segment: Song[] = [];
  
  segment.push(pickFromPool(personalizedPool, 'personal1', true)); 
  segment.push(pickFromPool(viralPool, 'viral', true)); // High overall viral score
  segment.push(pickFromPool(rapidTrendingPool, 'rapid-trend', true)); // Actively blowing up right now
  segment.push(pickFromPool(randomPool, 'discover'));
  segment.push(pickFromPool(personalizedPool, 'personal2', true));
  segment.push(pickFromPool(newPool, 'new'));

  return segment;
}

/**
 * Generates a specific mood-based feed segment.
 * Ensures all songs match the requested mood, ordered by viral score.
 */
export function generateMoodFeedSegment(targetMood: string): Song[] {
  // Filter all available songs that have the target mood
  const moodPool = dummySongs.filter(song => song.features.mood.includes(targetMood));
  
  // If we don't have enough songs for this mood, fallback to all songs
  const sourcePool = moodPool.length > 0 ? moodPool : dummySongs;

  // Sort them by our viral score so the best mood songs appear first
  const sortedPool = [...sourcePool].sort((a, b) => calculateViralScore(b) - calculateViralScore(a));

  const segment: Song[] = [];
  
  // Create a batch of 5 songs
  for (let i = 0; i < 5; i++) {
    // Pick mostly from the top of the sorted list, with some randomness to keep it fresh
    const poolLimit = Math.max(1, Math.ceil(sortedPool.length * 0.7)); // Top 70%
    const item = sortedPool[Math.floor(Math.random() * poolLimit)];
    
    segment.push({ 
      ...item, 
      id: `${item.id}-mood-${targetMood}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` 
    });
  }

  return segment;
}
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

  return score;
}

/**
 * A mock recommendation engine that generates a feed segment based on:
 * - Personalized: User's listening history
 * - Viral/Trending: Songs with the highest dynamic viral score
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
  
  // Viral/Trending: Sort by our dynamic viral score instead of raw popularity
  const trendingPool = [...dummySongs].sort((a, b) => calculateViralScore(b) - calculateViralScore(a));
  
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

  // 3. Construct a blended segment
  const segment: Song[] = [];
  
  segment.push(pickFromPool(personalizedPool, 'personal1', true)); 
  segment.push(pickFromPool(trendingPool, 'viral', true)); // High viral score
  segment.push(pickFromPool(randomPool, 'discover'));
  segment.push(pickFromPool(personalizedPool, 'personal2', true));
  segment.push(pickFromPool(newPool, 'new'));

  return segment;
}
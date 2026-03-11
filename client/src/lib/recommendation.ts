import { Song, dummySongs } from "./dummyData";
import { behaviorLogs } from "./tracking";

/**
 * Calculates a similarity score between a user's taste profile and a song's features.
 */
function calculateTasteMatchScore(song: Song, preferredMoods: Record<string, number>): number {
  let score = 0;
  
  // 1. Mood Matching (Heavy weight)
  // Check if any of the song's moods match the user's preferred moods
  song.features.mood.forEach(m => {
    if (preferredMoods[m]) {
      score += preferredMoods[m] * 2; // Weight mood matches heavily
    }
  });

  // 2. Base Popularity (Light weight, acts as a tiebreaker)
  const popularityScore = (song.features.popularity.plays * 0.0001) + 
                          (song.features.popularity.likes * 0.001) + 
                          (song.features.popularity.replays * 0.005);
  score += Math.min(popularityScore, 10); // Cap popularity contribution

  return score;
}

/**
 * A mock recommendation engine that generates a feed segment based on:
 * - Personalized: User's listening history (moods, energy, genre based on detailed metadata)
 * - Trending: Songs with high engagement/popularity
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
        // Calculate engagement score for this interaction
        let score = 0;
        
        // Completion/Duration signals
        if (!log.skipped && log.durationSeconds > 30) score += 2; // Long listen
        if (log.skipped && log.durationSeconds < 5) score -= 2;   // Fast skip
        
        // Explicit signals
        if (log.liked) score += 5;
        score += (log.replays * 3);
        
        // Apply this score to all moods associated with the song
        song.features.mood.forEach(m => {
          moodScores[m] = (moodScores[m] || 0) + score;
        });
      }
    });
  }

  // Helper to calculate total popularity
  const getPopularityTotal = (song: Song) => song.features.popularity.plays + song.features.popularity.likes + song.features.popularity.replays;

  // 2. Define our song pools
  // Trending: Top 50% by popularity feature
  const trendingPool = [...dummySongs].sort((a, b) => getPopularityTotal(b) - getPopularityTotal(a));
  
  // New Uploads: In a real app, this would use creation date. Here we use the end of the array.
  const newPool = [...dummySongs].reverse();

  // Personalized: Score all songs against the user's taste profile and take the top matches
  // If no history exists, fallback to just sorting by popularity
  const hasHistory = Object.keys(moodScores).length > 0;
  
  const personalizedPool = [...dummySongs].sort((a, b) => {
    if (!hasHistory) return getPopularityTotal(b) - getPopularityTotal(a);
    const scoreA = calculateTasteMatchScore(a, moodScores);
    const scoreB = calculateTasteMatchScore(b, moodScores);
    return scoreB - scoreA;
  });

  // Random Discovery: Entire pool
  const randomPool = [...dummySongs];

  // Helper to pick a random song from a pool and give it a unique instance ID for the infinite list
  // If we want the top N from a sorted pool (like personalized/trending), we can pass an index or pick from top half
  const pickFromPool = (pool: Song[], typePrefix: string, useTopHalf: boolean = false): Song => {
    const source = pool.length > 0 ? pool : dummySongs;
    
    let item;
    if (useTopHalf) {
      // Pick randomly from the top 50% of the sorted pool
      const topHalfLimit = Math.max(1, Math.ceil(source.length / 2));
      item = source[Math.floor(Math.random() * topHalfLimit)];
    } else {
      // Completely random
      item = source[Math.floor(Math.random() * source.length)];
    }

    // Return a clone with a unique ID for React rendering
    return { ...item, id: `${item.id}-${typePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` };
  };

  // 3. Construct a blended segment (5 songs per batch)
  // Our mix strategy: 2 Personalized, 1 Trending, 1 New, 1 Random
  const segment: Song[] = [];
  
  // pick from top half of personalized pool so we actually get good matches
  segment.push(pickFromPool(personalizedPool, 'personal1', true)); 
  segment.push(pickFromPool(trendingPool, 'trending', true));
  segment.push(pickFromPool(randomPool, 'discover'));
  segment.push(pickFromPool(personalizedPool, 'personal2', true));
  segment.push(pickFromPool(newPool, 'new'));

  return segment;
}
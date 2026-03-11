import { Song, dummySongs } from "./dummyData";
import { behaviorLogs } from "./tracking";

/**
 * A mock recommendation engine that generates a feed segment based on:
 * - Personalized: User's listening history (favorite mood/artist)
 * - Trending: Songs with high engagement
 * - New: Recently uploaded songs
 * - Random: Serendipitous discovery
 */
export function generateFeedSegment(): Song[] {
  // 1. Analyze user behavior to determine preferred mood
  const moodScores: Record<string, number> = {};
  let preferredMood: string | null = null;

  if (behaviorLogs.length > 0) {
    behaviorLogs.forEach(log => {
      const song = dummySongs.find(s => s.id === log.songId);
      if (song) {
        // Positive signals
        let score = 0;
        if (!log.skipped) score += 1;
        if (log.liked) score += 2;
        score += (log.replays * 2);
        
        // Negative signal
        if (log.skipped) score -= 1;

        moodScores[song.mood] = (moodScores[song.mood] || 0) + score;
      }
    });

    // Find the highest scoring mood
    let maxScore = -Infinity;
    for (const [mood, score] of Object.entries(moodScores)) {
      if (score > maxScore) {
        maxScore = score;
        preferredMood = mood;
      }
    }
  }

  // 2. Define our song pools
  // Trending: Top 50% by likes
  const trendingPool = [...dummySongs].sort((a, b) => b.likes - a.likes);
  
  // New Uploads: In a real app, this would use creation date. Here we use the end of the array or new mock IDs.
  const newPool = [...dummySongs].reverse();

  // Personalized: Songs matching the preferred mood
  const personalizedPool = preferredMood 
    ? dummySongs.filter(s => s.mood === preferredMood)
    : dummySongs; // Fallback if no history

  // Random Discovery: Entire pool
  const randomPool = [...dummySongs];

  // Helper to pick a random song from a pool and give it a unique instance ID for the infinite list
  const pickFromPool = (pool: Song[], typePrefix: string): Song => {
    const source = pool.length > 0 ? pool : dummySongs;
    const item = source[Math.floor(Math.random() * source.length)];
    // Return a clone with a unique ID for React rendering
    return { ...item, id: `${item.id}-${typePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` };
  };

  // 3. Construct a blended segment (e.g. 5 songs per batch)
  // Our mix strategy: 2 Personalized, 1 Trending, 1 New, 1 Random
  const segment: Song[] = [];
  
  segment.push(pickFromPool(personalizedPool, 'personal1'));
  segment.push(pickFromPool(trendingPool, 'trending'));
  segment.push(pickFromPool(randomPool, 'discover'));
  segment.push(pickFromPool(personalizedPool, 'personal2'));
  segment.push(pickFromPool(newPool, 'new'));

  return segment;
}
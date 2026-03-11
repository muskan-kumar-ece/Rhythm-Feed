export type ListenBehaviorEvent = {
  songId: string;
  songTitle: string;
  durationSeconds: number; // Exact total duration listened
  skipped: boolean;
  skipTimeSeconds: number | null; // Time at which the user skipped
  replays: number; // Number of times the song looped
  pauseCount: number; // Number of times the user paused the song
  liked: boolean;
  timestamp: string;
  timeOfDay: string;
  sessionLengthMinutes?: number; // Total length of the current app session
};

// In-memory array to store behavior logs for mockup purposes
export const behaviorLogs: ListenBehaviorEvent[] = [];

// Session tracking
let sessionStartTime = Date.now();

export const trackListenBehavior = (event: ListenBehaviorEvent) => {
  // Calculate session length
  const sessionLengthMinutes = (Date.now() - sessionStartTime) / 60000;
  
  const fullEvent = {
    ...event,
    sessionLengthMinutes: parseFloat(sessionLengthMinutes.toFixed(2))
  };

  behaviorLogs.push(fullEvent);
  
  console.log(
    `%c🎵 Tracked Behavior [${fullEvent.songTitle}]`, 
    "color: #a855f7; font-weight: bold", 
    `\nDuration: ${fullEvent.durationSeconds}s` +
    `\nSkipped: ${fullEvent.skipped ? 'Yes' + (fullEvent.skipTimeSeconds ? ` (at ${fullEvent.skipTimeSeconds}s)` : '') : 'No'}` +
    `\nReplays: ${fullEvent.replays}` +
    `\nPauses: ${fullEvent.pauseCount}` +
    `\nLiked: ${fullEvent.liked ? 'Yes' : 'No'}` +
    `\nTime of Day: ${fullEvent.timeOfDay}` +
    `\nSession Length: ${fullEvent.sessionLengthMinutes} min`
  );
  // In a full-stack app, this data would be sent to an AI recommendation engine via API.
};


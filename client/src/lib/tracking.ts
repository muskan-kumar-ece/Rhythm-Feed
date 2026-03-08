export type ListenBehaviorEvent = {
  songId: string;
  songTitle: string;
  durationSeconds: number;
  skipped: boolean;
  replays: number;
  liked: boolean;
  timestamp: string;
  timeOfDay: string;
};

// In-memory array to store behavior logs for mockup purposes
export const behaviorLogs: ListenBehaviorEvent[] = [];

export const trackListenBehavior = (event: ListenBehaviorEvent) => {
  behaviorLogs.push(event);
  console.log(
    `%c🎵 Tracked Behavior [${event.songTitle}]`, 
    "color: #a855f7; font-weight: bold", 
    `\nDuration: ${event.durationSeconds}s` +
    `\nSkipped: ${event.skipped ? 'Yes' : 'No'}` +
    `\nReplays: ${event.replays}` +
    `\nLiked: ${event.liked ? 'Yes' : 'No'}` +
    `\nTime of Day: ${event.timeOfDay}`
  );
  // In a full-stack app, this data would be sent to an AI recommendation engine via API.
};

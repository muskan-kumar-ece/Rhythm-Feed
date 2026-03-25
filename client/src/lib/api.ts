// Central API client - all backend calls go through here
import type { SessionContext } from "./session";

export type ApiSong = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  mood: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  lyrics: { time: number; text: string }[];
  features: {
    tempo: string;
    energy: string;
    genre: string[];
    mood: string[];
    popularity: {
      plays: number;
      likes: number;
      replays: number;
      completions: number;
      shares: number;
      recent24h: { plays: number; likes: number; replays: number; comments: number };
    };
  };
  uploadedBy: string | null;
  createdAt: string;
  // Distribution system
  distributionScore?: number;
  distributionPhase?: string;
  // Ranking metadata injected by the server (Stages 1–3)
  _score?: number;
  _scoreBreakdown?: {
    engagement: number;
    taste: number;
    sessionContext: number;
    recentBehavior: number;
    recency: number;
    timeOfDay: number;
    poolBonus: number;
    distributionMultiplier: number;
  };
  /** Which candidate pools nominated this song: taste | trending | new | exploration */
  _pools?: Array<"taste" | "trending" | "new" | "exploration">;
  _distributionPhase?: string;
  // Client-side only
  isFollowingArtist?: boolean;
};

export type ApiUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  followers: number;
  following: number;
  isArtist: boolean;
};

export type ApiMoment = {
  id: string;
  userId: string;
  songId: string;
  lyricLine: string;
  mood: string;
  caption: string;
  likes: number;
  comments: number;
  createdAt: string;
  user: ApiUser;
  song: ApiSong;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// Songs
export const api = {
  getSongs: () => request<ApiSong[]>("/api/songs"),
  getRankedSongs: (ctx?: SessionContext | null) => {
    const url = ctx
      ? `/api/songs/ranked?ctx=${encodeURIComponent(JSON.stringify(ctx))}`
      : "/api/songs/ranked";
    return request<ApiSong[]>(url);
  },
  getSongsByMood: (mood: string) => request<ApiSong[]>(`/api/songs/mood/${encodeURIComponent(mood)}`),
  searchSongs: (query: string) => request<ApiSong[]>(`/api/songs/search?q=${encodeURIComponent(query)}`),
  createSong: (data: Partial<ApiSong>) => request<ApiSong>("/api/songs", { method: "POST", body: JSON.stringify(data) }),

  // Like
  isLiked: (songId: string) => request<{ liked: boolean }>(`/api/songs/${songId}/liked`),
  likeSong: (songId: string) => request<{ success: boolean }>(`/api/songs/${songId}/like`, { method: "POST" }),
  unlikeSong: (songId: string) => request<{ success: boolean }>(`/api/songs/${songId}/like`, { method: "DELETE" }),
  getLikedSongs: () => request<ApiSong[]>("/api/user/liked-songs"),

  // Save
  isSaved: (songId: string) => request<{ saved: boolean }>(`/api/songs/${songId}/saved`),
  saveSong: (songId: string) => request<{ success: boolean }>(`/api/songs/${songId}/save`, { method: "POST" }),
  unsaveSong: (songId: string) => request<{ success: boolean }>(`/api/songs/${songId}/save`, { method: "DELETE" }),
  getSavedSongs: () => request<ApiSong[]>("/api/user/saved-songs"),

  // Share
  shareSong: (songId: string) => request<{ success: boolean }>(`/api/songs/${songId}/share`, { method: "POST" }),

  // Moments
  getMoments: () => request<ApiMoment[]>("/api/moments"),
  createMoment: (data: { songId: string; lyricLine: string; mood: string; caption: string }) =>
    request<ApiMoment>("/api/moments", { method: "POST", body: JSON.stringify(data) }),
  likeMoment: (momentId: string) => request<{ success: boolean }>(`/api/moments/${momentId}/like`, { method: "POST" }),
  unlikeMoment: (momentId: string) => request<{ success: boolean }>(`/api/moments/${momentId}/like`, { method: "DELETE" }),
  isMomentLiked: (momentId: string) => request<{ liked: boolean }>(`/api/moments/${momentId}/liked`),

  // User
  getProfile: () => request<ApiUser>("/api/user/profile"),
  getHistory: () => request<{ songId: string; durationSeconds: number; skipped: boolean; liked: boolean; replays: number; createdAt: string }[]>("/api/behavior"),

  // Behavior
  logBehavior: (data: { songId: string; durationSeconds: number; skipped: boolean; liked: boolean; replays: number }) =>
    request<{ id: string }>("/api/behavior", { method: "POST", body: JSON.stringify(data) }),

  // Artist
  getArtistSongs: () => request<ApiSong[]>("/api/artist/songs"),

  // AI DJ Session
  getAIDJSession: () => request<{
    greeting: string;
    theme: string;
    timeOfDay: string;
    dominantMood: string;
    hasHistory: boolean;
    topMoods: string[];
    playlist: ApiSong[];
  }>("/api/ai-dj/session"),

  // Moments — extended
  getTrendingMoments: () => request<ApiMoment[]>("/api/moments/trending"),
  getSongsFromMoments: () => request<ApiSong[]>("/api/moments/discover-songs"),

  // Analytics
  getRetentionData: (songId: string) =>
    request<{ bucket: number; count: number }[]>(`/api/analytics/retention/${songId}`),
  getMoodBreakdown: () =>
    request<{ mood: string; plays: number; completions: number; likes: number; skips: number }[]>("/api/analytics/mood-breakdown"),
  getHourlyPerformance: () =>
    request<{ hour: number; plays: number }[]>("/api/analytics/hourly"),
  getListenerGrowth: () =>
    request<{ date: string; plays: number }[]>("/api/analytics/growth"),
};

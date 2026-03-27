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
  // Moderation
  status?: "pending" | "approved" | "rejected";
  aiTags?: string[];
  rejectionReason?: string | null;
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

export type ApiTrendingMomentSong = ApiSong & { momentCount: number; topLyricLine: string };

export type ApiAdminStats = {
  dau: number;
  totalPlays: number;
  skipRate: number;
  completionRate: number;
  avgDuration: number;
  songsPerSession: number;
};

export type ApiAdminDailyActivity = {
  date: string;
  plays: number;
  skips: number;
  completions: number;
  likes: number;
};

export type ApiAdminRetention = {
  totalUsers: number;
  day1Retained: number;
  day7Retained: number;
};

export type ApiSongStats = {
  plays: number;
  likes: number;
  skips: number;
  completions: number;
  engagementScore: number;
};

export type ApiArtistRequest = {
  id: string;
  userId: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user?: ApiUser;
};

export type ApiUploadResult = {
  song: ApiSong;
  analysis: {
    tempo: string;
    energy: string;
    moodCategories: string[];
    aiTags: string[];
    estimatedBpm: number;
  };
  autoApproved: boolean;
};

export type ApiSpotlight = {
  id: string;
  artistName: string;
  artistAvatarUrl: string;
  title: string;
  description: string;
  mediaType: "audio" | "video";
  mediaUrl: string;
  coverUrl: string;
  durationSeconds: number;
  tags: string[];
  prompt: string;
  views: number;
  likes: number;
  uploadedBy: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type ApiComment = {
  id: string;
  userId: string;
  songId: string | null;
  momentId: string | null;
  content: string;
  createdAt: string;
  user: ApiUser;
};

export type ApiPlaylist = {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverImage: string | null;
  coverUrl: string | null;
  songCount: number;
  createdAt: string;
};

export type ApiPlaylistDetail = ApiPlaylist & { songs: ApiSong[] };

export type ApiNotification = {
  id: string;
  userId: string;
  type: "like" | "comment" | "follow";
  senderId: string;
  entityId: string | null;
  entityType: "song" | "moment" | "profile" | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    username: string;
  };
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

// Upload (multipart — no Content-Type header, browser sets boundary automatically)
async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", credentials: "include", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Upload failed");
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
  getFeed: (opts?: { limit?: number; exclude?: string[]; ctx?: SessionContext | null }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.exclude?.length) params.set("exclude", opts.exclude.join(","));
    if (opts?.ctx) params.set("ctx", encodeURIComponent(JSON.stringify(opts.ctx)));
    const qs = params.toString();
    return request<ApiSong[]>(qs ? `/api/feed?${qs}` : "/api/feed");
  },
  getSongsByMood: (mood: string) => request<ApiSong[]>(`/api/songs/mood/${encodeURIComponent(mood)}`),
  searchSongs: (query: string) => request<ApiSong[]>(`/api/songs/search?q=${encodeURIComponent(query)}`),
  createSong: (data: Partial<ApiSong>) => request<ApiSong>("/api/songs", { method: "POST", body: JSON.stringify(data) }),

  // Upload (real file upload)
  uploadTrack: (formData: FormData) => upload<ApiUploadResult>("/api/upload", formData),
  uploadProfileImage: (file: File) => {
    const fd = new FormData();
    fd.append("avatar", file);
    return upload<{ avatarUrl: string }>("/api/user/profile-image", fd);
  },

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
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    request<ApiUser>("/api/user/profile", { method: "PATCH", body: JSON.stringify(data) }),
  getHistory: () => request<{ songId: string; durationSeconds: number; skipped: boolean; liked: boolean; replays: number; createdAt: string }[]>("/api/behavior"),

  // Behavior
  logBehavior: (data: { songId: string; durationSeconds: number; skipped: boolean; liked: boolean; replays: number }) =>
    request<{ id: string }>("/api/behavior", { method: "POST", body: JSON.stringify(data) }),

  // Artist
  getArtistSongs: () => request<ApiSong[]>("/api/artist/songs"),
  getSongStats: (songId: string) => request<ApiSongStats>(`/api/artist/songs/${songId}/stats`),
  updateSongMetadata: (songId: string, data: {
    title?: string; artist?: string; mood?: string; genre?: string;
    tempo?: string; energy?: string; lyricsText?: string;
  }) => request<ApiSong>(`/api/artist/songs/${songId}/metadata`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),

  // AI DJ Session
  getAIDJSession: (prefs?: { moods: string[]; genres: string[] } | null) => {
    const url = prefs
      ? `/api/ai-dj/session?prefs=${encodeURIComponent(JSON.stringify(prefs))}`
      : "/api/ai-dj/session";
    return request<{
      greeting: string;
      theme: string;
      timeOfDay: string;
      dominantMood: string;
      hasHistory: boolean;
      topMoods: string[];
      playlist: ApiSong[];
    }>(url);
  },

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

  // Trending
  getTrendingViral: () => request<ApiSong[]>("/api/trending/viral"),
  getTrendingFastest: () => request<ApiSong[]>("/api/trending/fastest"),
  getTrendingMomentSongs: () => request<ApiTrendingMomentSong[]>("/api/trending/moments-songs"),

  // Song moments
  getSongMoments: (songId: string) =>
    request<(ApiMoment & { user: ApiUser })[]>(`/api/songs/${songId}/moments`),

  // AI DJ — next song
  getDJNextSong: (data: { excludeIds: string[]; sessionCtx?: SessionContext | null }) =>
    request<{ song: ApiSong; reason: string }>("/api/ai-dj/next", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Admin analytics
  getAdminStats: () => request<ApiAdminStats>("/api/admin/stats"),
  getAdminDailyActivity: () => request<ApiAdminDailyActivity[]>("/api/admin/daily-activity"),
  getAdminRetention: () => request<ApiAdminRetention>("/api/admin/retention"),

  // Admin moderation
  getPendingSongs: () => request<ApiSong[]>("/api/admin/pending"),
  getAdminSongs: (status?: string) => request<ApiSong[]>(`/api/admin/songs${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getArtistUploadCount: (artistName: string) => request<{ count: number }>(`/api/admin/artist-uploads?artist=${encodeURIComponent(artistName)}`),
  approveSong: (songId: string) => request<{ success: boolean; song: ApiSong }>(`/api/admin/songs/${songId}/approve`, { method: "POST" }),
  rejectSong: (songId: string, reason: string) => request<{ success: boolean; song: ApiSong }>(`/api/admin/songs/${songId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
  adminUpdateMetadata: (songId: string, data: { title?: string; artist?: string; mood?: string; genre?: string }) =>
    request<ApiSong>(`/api/admin/songs/${songId}/metadata`, { method: "PUT", body: JSON.stringify(data) }),
  bulkApproveSongs: (ids: string[]) => request<{ success: boolean; succeeded: number; total: number }>("/api/admin/songs/bulk-approve", {
    method: "POST",
    body: JSON.stringify({ ids }),
  }),
  bulkRejectSongs: (ids: string[], reason?: string) => request<{ success: boolean; succeeded: number; total: number }>("/api/admin/songs/bulk-reject", {
    method: "POST",
    body: JSON.stringify({ ids, reason }),
  }),

  // Auth actions
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  changeUsername: (newUsername: string, currentPassword: string) =>
    request<{ username: string }>("/api/user/username", {
      method: "PATCH",
      body: JSON.stringify({ newUsername, currentPassword }),
    }),

  // Preferences
  getPreferences: () => request<{
    autoplay: boolean; audioQuality: "low" | "high";
    crossfade: boolean; volumeNormalization: boolean; dataSaver: boolean;
    pushNotifications: boolean; notifyNewSongs: boolean; notifyActivity: boolean;
  }>("/api/user/preferences"),
  updatePreferences: (prefs: Partial<{
    autoplay: boolean; audioQuality: "low" | "high";
    crossfade: boolean; volumeNormalization: boolean; dataSaver: boolean;
    pushNotifications: boolean; notifyNewSongs: boolean; notifyActivity: boolean;
  }>) => request<typeof prefs>("/api/user/preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  }),

  // User stats
  getUserStats: () => request<{
    likedSongs: number; savedSongs: number; moments: number; totalListenSeconds: number;
  }>("/api/user/stats"),

  // Spotlights
  getSpotlights: (params?: { tag?: string; artist?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tag)    qs.set("tag",    params.tag);
    if (params?.artist) qs.set("artist", params.artist);
    if (params?.limit)  qs.set("limit",  String(params.limit));
    return request<ApiSpotlight[]>(`/api/spotlights${qs.toString() ? "?" + qs.toString() : ""}`);
  },
  getSpotlight: (id: string) => request<ApiSpotlight>(`/api/spotlights/${id}`),
  recordSpotlightView: (id: string) => request<{ success: boolean }>(`/api/spotlights/${id}/view`, { method: "POST" }),
  isSpotlightLiked: (id: string) => request<{ liked: boolean }>(`/api/spotlights/${id}/liked`),
  likeSpotlight: (id: string) => request<{ success: boolean; liked: boolean }>(`/api/spotlights/${id}/like`, { method: "POST" }),
  unlikeSpotlight: (id: string) => request<{ success: boolean; liked: boolean }>(`/api/spotlights/${id}/like`, { method: "DELETE" }),
  uploadSpotlight: (formData: FormData) => upload<{ spotlight: ApiSpotlight }>("/api/spotlights/upload", formData),

  // Artist follows (name-based, kept for backward compat)
  isFollowingArtist: (artistName: string) =>
    request<{ following: boolean }>(`/api/artists/followed?artistName=${encodeURIComponent(artistName)}`),
  followArtist: (artistName: string) =>
    request<{ success: boolean; following: boolean }>("/api/artists/follow", {
      method: "POST",
      body: JSON.stringify({ artistName }),
    }),
  unfollowArtist: (artistName: string) =>
    request<{ success: boolean; following: boolean }>("/api/artists/follow", {
      method: "DELETE",
      body: JSON.stringify({ artistName }),
    }),
  getFollowedArtists: () => request<string[]>("/api/artists/following"),

  // User follows (ID-based — primary system)
  isFollowingUser: (userId: string) =>
    request<{ following: boolean }>(`/api/users/${userId}/following`),
  followUser: (userId: string) =>
    request<{ success: boolean; following: boolean }>(`/api/users/${userId}/follow`, { method: "POST" }),
  unfollowUser: (userId: string) =>
    request<{ success: boolean; following: boolean }>(`/api/users/${userId}/follow`, { method: "DELETE" }),
  getUserFollowCounts: (userId: string) =>
    request<{ followers: number; following: number }>(`/api/users/${userId}/counts`),

  // User moments
  getUserMoments: () => request<ApiMoment[]>("/api/user/moments"),

  // Artist upgrade requests
  submitArtistRequest: (reason: string) =>
    request<{ request: ApiArtistRequest }>("/api/artist-request", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  getMyArtistRequest: () =>
    request<{ request: ApiArtistRequest | null }>("/api/artist-request/my"),

  // Admin — artist requests
  getAdminArtistRequests: (status?: string) =>
    request<ApiArtistRequest[]>(`/api/admin/artist-requests${status ? `?status=${status}` : ""}`),
  approveArtistRequest: (id: string) =>
    request<{ success: boolean }>(`/api/admin/artist-requests/${id}/approve`, { method: "POST" }),
  rejectArtistRequest: (id: string, adminNote?: string) =>
    request<{ success: boolean }>(`/api/admin/artist-requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ adminNote: adminNote ?? "" }),
    }),

  // Admin — role management
  updateUserRole: (userId: string, role: string) =>
    request<{ success: boolean; role: string }>(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  // Individual resource fetchers (for deep-link pages)
  getSong: (id: string) => request<ApiSong>(`/api/songs/${id}`),
  getMoment: (id: string) => request<ApiMoment>(`/api/moments/${id}`),

  // Comments
  getComments: (params: { songId?: string; momentId?: string }) => {
    const qs = new URLSearchParams();
    if (params.songId)   qs.set("songId",   params.songId);
    if (params.momentId) qs.set("momentId", params.momentId);
    return request<ApiComment[]>(`/api/comments?${qs.toString()}`);
  },
  createComment: (data: { content: string; songId?: string; momentId?: string }) =>
    request<ApiComment>("/api/comments", { method: "POST", body: JSON.stringify(data) }),

  // Playlists
  getPlaylists: () => request<ApiPlaylist[]>("/api/playlists"),
  getPlaylist: (id: string) => request<ApiPlaylistDetail>(`/api/playlists/${id}`),
  createPlaylist: (data: { name: string; description?: string }) =>
    request<ApiPlaylist>("/api/playlists", { method: "POST", body: JSON.stringify(data) }),
  updatePlaylist: (id: string, data: { name?: string; description?: string }) =>
    request<ApiPlaylist>(`/api/playlists/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePlaylist: (id: string) =>
    request<{ success: boolean }>(`/api/playlists/${id}`, { method: "DELETE" }),
  uploadPlaylistCover: (id: string, file: File) => {
    const fd = new FormData();
    fd.append("cover", file);
    return upload<{ success: boolean; coverUrl: string }>(`/api/playlists/${id}/cover`, fd);
  },
  addSongToPlaylist: (playlistId: string, songId: string) =>
    request<{ success: boolean }>(`/api/playlists/${playlistId}/songs`, { method: "POST", body: JSON.stringify({ songId }) }),
  removeSongFromPlaylist: (playlistId: string, songId: string) =>
    request<{ success: boolean }>(`/api/playlists/${playlistId}/songs/${songId}`, { method: "DELETE" }),

  // Notifications
  getNotifications: () => request<ApiNotification[]>("/api/notifications"),
  getUnreadCount: () => request<{ count: number }>("/api/notifications/unread-count"),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>("/api/notifications/read-all", { method: "PATCH" }),
};

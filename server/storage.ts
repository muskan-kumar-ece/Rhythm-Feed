import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, ilike, sql, gte, ne } from "drizzle-orm";
import pg from "pg";
import {
  users, songs, moments, behaviorLogs, songLikes, songSaves, momentLikes, artistFollows,
  spotlights, spotlightLikes, artistRequests,
  type User, type InsertUser,
  type Song, type InsertSong,
  type Moment, type InsertMoment,
  type BehaviorLog, type InsertBehaviorLog,
  type Spotlight, type InsertSpotlight,
  type ArtistRequest,
} from "@shared/schema";
import type { DistributionPhase } from "./discovery";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAuth(id: string, data: { passwordHash?: string; email?: string }): Promise<User | undefined>;
  updateUserProfile(id: string, data: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<User | undefined>;

  // Songs
  getSongs(): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  getSongsByMood(mood: string): Promise<Song[]>;
  searchSongs(query: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
  incrementSongStat(songId: string, field: "likes" | "comments" | "saves" | "shares"): Promise<void>;
  decrementSongStat(songId: string, field: "likes" | "saves"): Promise<void>;
  updateSongStatus(songId: string, status: "approved" | "rejected", rejectionReason?: string): Promise<Song | undefined>;
  updateSongMetadata(songId: string, data: Partial<Pick<Song, "title" | "artist" | "mood" | "features" | "lyrics" | "aiTags">>): Promise<Song | undefined>;
  getPendingSongs(): Promise<Song[]>;
  getAdminSongs(status?: string): Promise<Song[]>;

  // Spotlights
  getSpotlights(limit?: number): Promise<Spotlight[]>;
  getSpotlight(id: string): Promise<Spotlight | undefined>;
  createSpotlight(data: InsertSpotlight): Promise<Spotlight>;
  incrementSpotlightView(id: string): Promise<void>;
  likeSpotlight(userId: string, spotlightId: string): Promise<void>;
  unlikeSpotlight(userId: string, spotlightId: string): Promise<void>;
  isSpotlightLiked(userId: string, spotlightId: string): Promise<boolean>;
  getArtistSpotlights(artistName: string): Promise<Spotlight[]>;
  getSpotlightsByTag(tag: string): Promise<Spotlight[]>;
  updateSpotlightStatus(id: string, status: "approved" | "rejected"): Promise<Spotlight | undefined>;
  getArtistUploadCount(artistName: string): Promise<number>;
  getSongStats(songId: string): Promise<{ plays: number; likes: number; skips: number; completions: number; engagementScore: number }>;
  getArtistSongsAll(userId: string): Promise<Song[]>;

  // Likes
  likeSong(userId: string, songId: string): Promise<void>;
  unlikeSong(userId: string, songId: string): Promise<void>;
  isLiked(userId: string, songId: string): Promise<boolean>;
  getLikedSongs(userId: string): Promise<Song[]>;

  // Saves
  saveSong(userId: string, songId: string): Promise<void>;
  unsaveSong(userId: string, songId: string): Promise<void>;
  isSaved(userId: string, songId: string): Promise<boolean>;
  getSavedSongs(userId: string): Promise<Song[]>;

  // Moments
  getMoments(): Promise<(Moment & { user: User; song: Song })[]>;
  createMoment(moment: InsertMoment): Promise<Moment>;
  likeMoment(userId: string, momentId: string): Promise<void>;
  unlikeMoment(userId: string, momentId: string): Promise<void>;
  isMomentLiked(userId: string, momentId: string): Promise<boolean>;
  commentMoment(momentId: string): Promise<void>;

  // Behavior Logs
  logBehavior(log: InsertBehaviorLog): Promise<BehaviorLog>;
  getUserBehaviorLogs(userId: string): Promise<BehaviorLog[]>;
  getSongBehaviorLogs(songId: string): Promise<BehaviorLog[]>;

  // Artist
  getArtistSongs(userId: string): Promise<Song[]>;

  // Discovery boost
  updateSongDistribution(songId: string, score: number, phase: DistributionPhase): Promise<void>;

  // Analytics
  getAnalyticsRetention(songId: string): Promise<{ bucket: number; count: number }[]>;
  getAnalyticsMoodBreakdown(): Promise<{ mood: string; plays: number; completions: number; likes: number; skips: number }[]>;
  getAnalyticsHourly(): Promise<{ hour: number; plays: number }[]>;
  getAnalyticsGrowth(): Promise<{ date: string; plays: number }[]>;

  // Moments — extended
  getTrendingMoments(): Promise<(Moment & { user: User; song: Song })[]>;
  getSongsFromMoments(): Promise<Song[]>;
  getSongMoments(songId: string): Promise<(Moment & { user: User })[]>;

  // Trending
  getTrendingViral(limit?: number): Promise<Song[]>;
  getTrendingFastest(limit?: number): Promise<Song[]>;
  getTrendingMomentSongs(limit?: number): Promise<(Song & { momentCount: number; topLyricLine: string })[]>;

  // Admin analytics
  getAdminStats(): Promise<{ dau: number; totalPlays: number; skipRate: number; completionRate: number; avgDuration: number; songsPerSession: number }>;
  getAdminDailyActivity(days?: number): Promise<{ date: string; plays: number; skips: number; completions: number; likes: number }[]>;
  getAdminRetentionData(): Promise<{ totalUsers: number; day1Retained: number; day7Retained: number }>;

  // Artist follows
  followArtist(userId: string, artistName: string): Promise<void>;
  unfollowArtist(userId: string, artistName: string): Promise<void>;
  isFollowingArtist(userId: string, artistName: string): Promise<boolean>;
  getFollowedArtists(userId: string): Promise<string[]>;

  // User moments
  getUserMoments(userId: string): Promise<(Moment & { user: User; song: Song })[]>;

  // Preferences
  updateUserPreferences(id: string, prefs: Partial<User["preferences"]>): Promise<User | undefined>;

  // User stats
  getUserStats(id: string): Promise<{ likedSongs: number; savedSongs: number; moments: number; totalListenSeconds: number }>;

  // Username change
  changeUsername(id: string, newUsername: string): Promise<User | undefined>;

  // Role management
  updateUserRole(id: string, role: string): Promise<User | undefined>;

  // Artist upgrade requests
  createArtistRequest(userId: string, reason: string): Promise<ArtistRequest>;
  getArtistRequestByUser(userId: string): Promise<ArtistRequest | undefined>;
  getPendingArtistRequests(): Promise<(ArtistRequest & { user: User })[]>;
  getAllArtistRequests(status?: string): Promise<(ArtistRequest & { user: User })[]>;
  updateArtistRequest(id: string, status: "approved" | "rejected", adminNote?: string): Promise<ArtistRequest | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUserAuth(id: string, data: { passwordHash?: string; email?: string }): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ ...(data.passwordHash !== undefined && { passwordHash: data.passwordHash }),
             ...(data.email      !== undefined && { email:        data.email })        })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserProfile(id: string, data: { displayName?: string; bio?: string; avatarUrl?: string }): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.bio         !== undefined && { bio:         data.bio         }),
        ...(data.avatarUrl   !== undefined && { avatarUrl:   data.avatarUrl   }),
      })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserPreferences(id: string, prefs: Partial<User["preferences"]>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const merged = { ...((user.preferences as any) ?? {}), ...prefs };
    const [updated] = await db.update(users)
      .set({ preferences: merged } as any)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getUserStats(id: string): Promise<{ likedSongs: number; savedSongs: number; moments: number; totalListenSeconds: number }> {
    const [likedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(songLikes)
      .where(eq(songLikes.userId, id));
    const [savedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(songSaves)
      .where(eq(songSaves.userId, id));
    const [momentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(moments)
      .where(eq(moments.userId, id));
    const [listenResult] = await db
      .select({ total: sql<number>`coalesce(sum(duration_seconds), 0)` })
      .from(behaviorLogs)
      .where(eq(behaviorLogs.userId, id));
    return {
      likedSongs:         Number(likedResult?.count ?? 0),
      savedSongs:         Number(savedResult?.count ?? 0),
      moments:            Number(momentsResult?.count ?? 0),
      totalListenSeconds: Number(listenResult?.total ?? 0),
    };
  }

  async changeUsername(id: string, newUsername: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ username: newUsername.toLowerCase() } as any)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ role } as any)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async getSongs(): Promise<Song[]> {
    return db.select().from(songs).where(eq(songs.status, "approved")).orderBy(desc(songs.createdAt));
  }

  async getSong(id: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async getSongsByMood(mood: string): Promise<Song[]> {
    return db.select().from(songs).where(
      and(
        eq(songs.status, "approved"),
        sql`${songs.features}->>'mood' ILIKE ${'%' + mood + '%'}`
      )
    ).orderBy(desc(songs.likes));
  }

  async searchSongs(query: string): Promise<Song[]> {
    return db.select().from(songs).where(
      and(
        eq(songs.status, "approved"),
        sql`${songs.title} ILIKE ${'%' + query + '%'} OR ${songs.artist} ILIKE ${'%' + query + '%'}`
      )
    );
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [newSong] = await db.insert(songs).values(song).returning();
    return newSong;
  }

  async updateSongStatus(songId: string, status: "approved" | "rejected", rejectionReason?: string): Promise<Song | undefined> {
    const updateData: Partial<Song> = { status };
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (status === "approved") {
      updateData.distributionScore = 10;
      updateData.distributionPhase = "test";
    }
    const [updated] = await db.update(songs).set(updateData).where(eq(songs.id, songId)).returning();
    return updated;
  }

  async updateSongMetadata(songId: string, data: Partial<Pick<Song, "title" | "artist" | "mood" | "features" | "lyrics" | "aiTags">>): Promise<Song | undefined> {
    const [updated] = await db.update(songs).set(data).where(eq(songs.id, songId)).returning();
    return updated;
  }

  async getPendingSongs(): Promise<Song[]> {
    return db.select().from(songs).where(eq(songs.status, "pending")).orderBy(desc(songs.createdAt));
  }

  async getAdminSongs(status?: string): Promise<Song[]> {
    if (!status || status === "all") {
      return db.select().from(songs).orderBy(desc(songs.createdAt));
    }
    return db.select().from(songs).where(eq(songs.status, status as "pending" | "approved" | "rejected")).orderBy(desc(songs.createdAt));
  }

  async getArtistUploadCount(artistName: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(songs).where(eq(songs.artist, artistName));
    return result[0]?.count ?? 0;
  }

  async getSongStats(songId: string): Promise<{ plays: number; likes: number; skips: number; completions: number; engagementScore: number }> {
    const logs = await this.getSongBehaviorLogs(songId);
    const plays = logs.length;
    const likes = logs.filter(l => l.liked).length;
    const skips = logs.filter(l => l.skipped).length;
    const completions = plays - skips;
    const replays = logs.reduce((s, l) => s + l.replays, 0);
    const engagementScore = plays === 0 ? 0 :
      Math.min(100, Math.round(
        (completions / plays * 40) +
        (likes / plays * 35) +
        (Math.min(replays / plays, 1) * 25)
      ));
    return { plays, likes, skips, completions, engagementScore };
  }

  async getArtistSongsAll(userId: string): Promise<Song[]> {
    return db.select().from(songs).where(eq(songs.uploadedBy, userId)).orderBy(desc(songs.createdAt));
  }

  async incrementSongStat(songId: string, field: "likes" | "comments" | "saves" | "shares"): Promise<void> {
    await db.update(songs).set({ [field]: sql`${songs[field]} + 1` }).where(eq(songs.id, songId));
  }

  async decrementSongStat(songId: string, field: "likes" | "saves"): Promise<void> {
    await db.update(songs).set({ [field]: sql`GREATEST(${songs[field]} - 1, 0)` }).where(eq(songs.id, songId));
  }

  async likeSong(userId: string, songId: string): Promise<void> {
    const exists = await this.isLiked(userId, songId);
    if (!exists) {
      await db.insert(songLikes).values({ userId, songId });
      await this.incrementSongStat(songId, "likes");
    }
  }

  async unlikeSong(userId: string, songId: string): Promise<void> {
    await db.delete(songLikes).where(and(eq(songLikes.userId, userId), eq(songLikes.songId, songId)));
    await this.decrementSongStat(songId, "likes");
  }

  async isLiked(userId: string, songId: string): Promise<boolean> {
    const [row] = await db.select().from(songLikes).where(and(eq(songLikes.userId, userId), eq(songLikes.songId, songId)));
    return !!row;
  }

  async getLikedSongs(userId: string): Promise<Song[]> {
    const rows = await db
      .select({ song: songs })
      .from(songLikes)
      .innerJoin(songs, eq(songLikes.songId, songs.id))
      .where(eq(songLikes.userId, userId))
      .orderBy(desc(songLikes.createdAt));
    return rows.map(r => r.song);
  }

  async saveSong(userId: string, songId: string): Promise<void> {
    const exists = await this.isSaved(userId, songId);
    if (!exists) {
      await db.insert(songSaves).values({ userId, songId });
      await this.incrementSongStat(songId, "saves");
    }
  }

  async unsaveSong(userId: string, songId: string): Promise<void> {
    await db.delete(songSaves).where(and(eq(songSaves.userId, userId), eq(songSaves.songId, songId)));
    await this.decrementSongStat(songId, "saves");
  }

  async isSaved(userId: string, songId: string): Promise<boolean> {
    const [row] = await db.select().from(songSaves).where(and(eq(songSaves.userId, userId), eq(songSaves.songId, songId)));
    return !!row;
  }

  async getSavedSongs(userId: string): Promise<Song[]> {
    const rows = await db
      .select({ song: songs })
      .from(songSaves)
      .innerJoin(songs, eq(songSaves.songId, songs.id))
      .where(eq(songSaves.userId, userId))
      .orderBy(desc(songSaves.createdAt));
    return rows.map(r => r.song);
  }

  async getMoments(): Promise<(Moment & { user: User; song: Song })[]> {
    const rows = await db
      .select({ moment: moments, user: users, song: songs })
      .from(moments)
      .innerJoin(users, eq(moments.userId, users.id))
      .innerJoin(songs, eq(moments.songId, songs.id))
      .orderBy(desc(moments.createdAt));
    return rows.map(r => ({ ...r.moment, user: r.user, song: r.song }));
  }

  async createMoment(moment: InsertMoment): Promise<Moment> {
    const [newMoment] = await db.insert(moments).values(moment).returning();
    return newMoment;
  }

  async likeMoment(userId: string, momentId: string): Promise<void> {
    const exists = await this.isMomentLiked(userId, momentId);
    if (!exists) {
      await db.insert(momentLikes).values({ userId, momentId });
      await db.update(moments).set({ likes: sql`${moments.likes} + 1` }).where(eq(moments.id, momentId));
    }
  }

  async unlikeMoment(userId: string, momentId: string): Promise<void> {
    await db.delete(momentLikes).where(and(eq(momentLikes.userId, userId), eq(momentLikes.momentId, momentId)));
    await db.update(moments).set({ likes: sql`GREATEST(${moments.likes} - 1, 0)` }).where(eq(moments.id, momentId));
  }

  async isMomentLiked(userId: string, momentId: string): Promise<boolean> {
    const [row] = await db.select().from(momentLikes).where(and(eq(momentLikes.userId, userId), eq(momentLikes.momentId, momentId)));
    return !!row;
  }

  async commentMoment(momentId: string): Promise<void> {
    await db.update(moments).set({ comments: sql`${moments.comments} + 1` }).where(eq(moments.id, momentId));
  }

  async logBehavior(log: InsertBehaviorLog): Promise<BehaviorLog> {
    const [newLog] = await db.insert(behaviorLogs).values(log).returning();
    return newLog;
  }

  async getUserBehaviorLogs(userId: string): Promise<BehaviorLog[]> {
    return db.select().from(behaviorLogs).where(eq(behaviorLogs.userId, userId)).orderBy(desc(behaviorLogs.createdAt));
  }

  async getSongBehaviorLogs(songId: string): Promise<BehaviorLog[]> {
    return db.select().from(behaviorLogs).where(eq(behaviorLogs.songId, songId)).orderBy(desc(behaviorLogs.createdAt));
  }

  async getArtistSongs(userId: string): Promise<Song[]> {
    return db.select().from(songs).where(eq(songs.uploadedBy, userId)).orderBy(desc(songs.createdAt));
  }

  async updateSongDistribution(songId: string, score: number, phase: DistributionPhase): Promise<void> {
    await db.update(songs)
      .set({ distributionScore: score, distributionPhase: phase })
      .where(eq(songs.id, songId));
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  /** Retention: how far users listen before dropping off, in 10-second buckets. */
  async getAnalyticsRetention(songId: string): Promise<{ bucket: number; count: number }[]> {
    const rows = await db
      .select({
        bucket: sql<number>`FLOOR(${behaviorLogs.durationSeconds}::float / 10)::integer`,
        count:  sql<number>`COUNT(*)::integer`,
      })
      .from(behaviorLogs)
      .where(eq(behaviorLogs.songId, songId))
      .groupBy(sql`FLOOR(${behaviorLogs.durationSeconds}::float / 10)::integer`)
      .orderBy(sql`FLOOR(${behaviorLogs.durationSeconds}::float / 10)::integer`);
    return rows;
  }

  /** Mood breakdown: aggregate engagement stats per mood across all songs. */
  async getAnalyticsMoodBreakdown(): Promise<{ mood: string; plays: number; completions: number; likes: number; skips: number }[]> {
    const rows = await db
      .select({
        mood:        songs.mood,
        plays:       sql<number>`COUNT(${behaviorLogs.id})::integer`,
        completions: sql<number>`SUM(CASE WHEN ${behaviorLogs.skipped} = false THEN 1 ELSE 0 END)::integer`,
        likes:       sql<number>`SUM(CASE WHEN ${behaviorLogs.liked} = true THEN 1 ELSE 0 END)::integer`,
        skips:       sql<number>`SUM(CASE WHEN ${behaviorLogs.skipped} = true THEN 1 ELSE 0 END)::integer`,
      })
      .from(behaviorLogs)
      .innerJoin(songs, eq(behaviorLogs.songId, songs.id))
      .groupBy(songs.mood)
      .orderBy(sql`COUNT(${behaviorLogs.id}) DESC`);
    return rows;
  }

  /** Hourly: how many plays happen at each hour of the day (0–23). */
  async getAnalyticsHourly(): Promise<{ hour: number; plays: number }[]> {
    const rows = await db
      .select({
        hour:  sql<number>`EXTRACT(HOUR FROM ${behaviorLogs.createdAt})::integer`,
        plays: sql<number>`COUNT(*)::integer`,
      })
      .from(behaviorLogs)
      .groupBy(sql`EXTRACT(HOUR FROM ${behaviorLogs.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${behaviorLogs.createdAt})`);
    return rows;
  }

  /** Growth: plays per day for the last 30 days. */
  async getAnalyticsGrowth(): Promise<{ date: string; plays: number }[]> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        date:  sql<string>`DATE(${behaviorLogs.createdAt})::text`,
        plays: sql<number>`COUNT(*)::integer`,
      })
      .from(behaviorLogs)
      .where(gte(behaviorLogs.createdAt, cutoff))
      .groupBy(sql`DATE(${behaviorLogs.createdAt})`)
      .orderBy(sql`DATE(${behaviorLogs.createdAt})`);
    return rows;
  }

  // ── Moments — extended ────────────────────────────────────────────────────

  /** Trending moments: ranked by engagement score (likes*2 + comments). */
  async getTrendingMoments(): Promise<(Moment & { user: User; song: Song })[]> {
    const rows = await db
      .select({ moment: moments, user: users, song: songs })
      .from(moments)
      .innerJoin(users, eq(moments.userId, users.id))
      .innerJoin(songs, eq(moments.songId, songs.id))
      .orderBy(sql`${moments.likes} * 2 + ${moments.comments} DESC`)
      .limit(20);
    return rows.map(r => ({ ...r.moment, user: r.user, song: r.song }));
  }

  /** Songs discovered via moments: unique songs from top-engaged moments. */
  async getSongsFromMoments(): Promise<Song[]> {
    const rows = await db
      .selectDistinctOn([moments.songId], { song: songs })
      .from(moments)
      .innerJoin(songs, eq(moments.songId, songs.id))
      .orderBy(moments.songId, sql`${moments.likes} * 2 + ${moments.comments} DESC`)
      .limit(10);
    return rows.map(r => r.song);
  }

  /** All moments for a single song, ordered by engagement. */
  async getSongMoments(songId: string): Promise<(Moment & { user: User })[]> {
    const rows = await db
      .select({ moment: moments, user: users })
      .from(moments)
      .innerJoin(users, eq(moments.userId, users.id))
      .where(eq(moments.songId, songId))
      .orderBy(sql`${moments.likes} * 2 + ${moments.comments} DESC`)
      .limit(30);
    return rows.map(r => ({ ...r.moment, user: r.user }));
  }

  // ── Trending ────────────────────────────────────────────────────────────────

  /** Viral songs: highest recent 24h engagement score. */
  async getTrendingViral(limit = 10): Promise<Song[]> {
    return db.select().from(songs)
      .where(eq(songs.status, "approved"))
      .orderBy(sql`
        COALESCE((${songs.features}->'popularity'->'recent24h'->>'plays')::int, 0) +
        COALESCE((${songs.features}->'popularity'->'recent24h'->>'likes')::int, 0) * 2 +
        COALESCE((${songs.features}->'popularity'->'recent24h'->>'replays')::int, 0) * 3 +
        COALESCE((${songs.features}->'popularity'->'recent24h'->>'comments')::int, 0) DESC
      `)
      .limit(limit);
  }

  /** Fastest growing: highest ratio of recent24h plays to total plays. */
  async getTrendingFastest(limit = 10): Promise<Song[]> {
    return db.select().from(songs)
      .where(eq(songs.status, "approved"))
      .orderBy(sql`
        COALESCE((${songs.features}->'popularity'->'recent24h'->>'plays')::float, 0) /
        GREATEST(COALESCE((${songs.features}->'popularity'->>'plays')::float, 1), 1) DESC
      `)
      .limit(limit);
  }

  /** Songs trending in Moments: most moments created, highest engagement. */
  async getTrendingMomentSongs(limit = 10): Promise<(Song & { momentCount: number; topLyricLine: string })[]> {
    const rows = await db.execute(sql`
      SELECT
        s.*,
        COUNT(m.id)::int AS moment_count,
        COALESCE(
          (SELECT m2.lyric_line FROM moments m2
           WHERE m2.song_id = s.id
           ORDER BY m2.likes DESC LIMIT 1),
          ''
        ) AS top_lyric_line
      FROM songs s
      LEFT JOIN moments m ON m.song_id = s.id
      WHERE s.status = 'approved'
      GROUP BY s.id
      HAVING COUNT(m.id) > 0
      ORDER BY COUNT(m.id) DESC, COALESCE(SUM(m.likes + m.comments), 0) DESC
      LIMIT ${limit}
    `);
    return (rows.rows as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      title: r.title as string,
      artist: r.artist as string,
      coverUrl: r.cover_url as string,
      audioUrl: r.audio_url as string,
      mood: r.mood as string,
      likes: r.likes as number,
      comments: r.comments as number,
      saves: r.saves as number,
      shares: r.shares as number,
      lyrics: r.lyrics as Song["lyrics"],
      features: r.features as Song["features"],
      uploadedBy: r.uploaded_by as string | null,
      createdAt: r.created_at as Date,
      distributionScore: r.distribution_score as number,
      distributionPhase: r.distribution_phase as string,
      status: (r.status as string) ?? "approved",
      aiTags: (r.ai_tags as string[]) ?? [],
      rejectionReason: r.rejection_reason as string | null,
      momentCount: r.moment_count as number,
      topLyricLine: r.top_lyric_line as string,
    }));
  }

  // ── Admin Analytics ─────────────────────────────────────────────────────────

  async getAdminStats(): Promise<{
    dau: number; totalPlays: number; skipRate: number;
    completionRate: number; avgDuration: number; songsPerSession: number;
  }> {
    const [row] = await db.select({
      dau:             sql<number>`COUNT(DISTINCT CASE WHEN ${behaviorLogs.createdAt} > NOW() - INTERVAL '24 hours' THEN ${behaviorLogs.userId} END)::int`,
      totalPlays:      sql<number>`COUNT(*)::int`,
      skipRate:        sql<number>`ROUND(SUM(CASE WHEN ${behaviorLogs.skipped} THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)`,
      completionRate:  sql<number>`ROUND(SUM(CASE WHEN NOT ${behaviorLogs.skipped} THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)`,
      avgDuration:     sql<number>`ROUND(AVG(${behaviorLogs.durationSeconds})::numeric, 1)`,
      distinctUsers:   sql<number>`NULLIF(COUNT(DISTINCT ${behaviorLogs.userId}), 0)`,
    }).from(behaviorLogs);

    const songsPerSession = row.totalPlays && row.distinctUsers
      ? parseFloat((row.totalPlays / row.distinctUsers).toFixed(1))
      : 0;

    return {
      dau:            row.dau            ?? 0,
      totalPlays:     row.totalPlays     ?? 0,
      skipRate:       row.skipRate       ?? 0,
      completionRate: row.completionRate ?? 0,
      avgDuration:    row.avgDuration    ?? 0,
      songsPerSession,
    };
  }

  async getAdminDailyActivity(days = 14): Promise<{ date: string; plays: number; skips: number; completions: number; likes: number }[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.select({
      date:        sql<string>`DATE(${behaviorLogs.createdAt})::text`,
      plays:       sql<number>`COUNT(*)::int`,
      skips:       sql<number>`SUM(CASE WHEN ${behaviorLogs.skipped} THEN 1 ELSE 0 END)::int`,
      completions: sql<number>`SUM(CASE WHEN NOT ${behaviorLogs.skipped} THEN 1 ELSE 0 END)::int`,
      likes:       sql<number>`SUM(CASE WHEN ${behaviorLogs.liked} THEN 1 ELSE 0 END)::int`,
    })
    .from(behaviorLogs)
    .where(gte(behaviorLogs.createdAt, cutoff))
    .groupBy(sql`DATE(${behaviorLogs.createdAt})`)
    .orderBy(sql`DATE(${behaviorLogs.createdAt})`);
    return rows;
  }

  async getAdminRetentionData(): Promise<{ totalUsers: number; day1Retained: number; day7Retained: number }> {
    const rows = await db.execute(sql`
      WITH first_days AS (
        SELECT user_id, MIN(DATE(created_at)) AS first_day
        FROM behavior_logs GROUP BY user_id
      )
      SELECT
        COUNT(DISTINCT fd.user_id)::int AS total_users,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM behavior_logs b WHERE b.user_id = fd.user_id
          AND DATE(b.created_at) = fd.first_day + INTERVAL '1 day'
        ) THEN fd.user_id END)::int AS day1_retained,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM behavior_logs b WHERE b.user_id = fd.user_id
          AND DATE(b.created_at) BETWEEN fd.first_day + INTERVAL '6 days' AND fd.first_day + INTERVAL '8 days'
        ) THEN fd.user_id END)::int AS day7_retained
      FROM first_days fd
    `);
    const r = rows.rows[0] as Record<string, unknown> | undefined;
    return {
      totalUsers:    (r?.total_users    as number) ?? 0,
      day1Retained:  (r?.day1_retained  as number) ?? 0,
      day7Retained:  (r?.day7_retained  as number) ?? 0,
    };
  }

  // ── Spotlights ────────────────────────────────────────────────────────────

  async getSpotlights(limit = 20): Promise<Spotlight[]> {
    return db.select().from(spotlights)
      .where(eq(spotlights.status, "approved"))
      .orderBy(desc(spotlights.createdAt))
      .limit(limit);
  }

  async getSpotlight(id: string): Promise<Spotlight | undefined> {
    const [row] = await db.select().from(spotlights).where(eq(spotlights.id, id));
    return row;
  }

  async createSpotlight(data: InsertSpotlight): Promise<Spotlight> {
    const [row] = await db.insert(spotlights).values(data).returning();
    return row;
  }

  async incrementSpotlightView(id: string): Promise<void> {
    await db.update(spotlights).set({ views: sql`${spotlights.views} + 1` }).where(eq(spotlights.id, id));
  }

  async likeSpotlight(userId: string, spotlightId: string): Promise<void> {
    const exists = await this.isSpotlightLiked(userId, spotlightId);
    if (!exists) {
      await db.insert(spotlightLikes).values({ userId, spotlightId });
      await db.update(spotlights).set({ likes: sql`${spotlights.likes} + 1` }).where(eq(spotlights.id, spotlightId));
    }
  }

  async unlikeSpotlight(userId: string, spotlightId: string): Promise<void> {
    const exists = await this.isSpotlightLiked(userId, spotlightId);
    if (exists) {
      await db.delete(spotlightLikes).where(
        and(eq(spotlightLikes.userId, userId), eq(spotlightLikes.spotlightId, spotlightId))
      );
      await db.update(spotlights).set({ likes: sql`GREATEST(${spotlights.likes} - 1, 0)` }).where(eq(spotlights.id, spotlightId));
    }
  }

  async isSpotlightLiked(userId: string, spotlightId: string): Promise<boolean> {
    const [row] = await db.select().from(spotlightLikes).where(
      and(eq(spotlightLikes.userId, userId), eq(spotlightLikes.spotlightId, spotlightId))
    );
    return !!row;
  }

  async getArtistSpotlights(artistName: string): Promise<Spotlight[]> {
    return db.select().from(spotlights)
      .where(and(eq(spotlights.artistName, artistName), eq(spotlights.status, "approved")))
      .orderBy(desc(spotlights.createdAt));
  }

  async getSpotlightsByTag(tag: string): Promise<Spotlight[]> {
    return db.select().from(spotlights)
      .where(and(
        eq(spotlights.status, "approved"),
        sql`${spotlights.tags} ? ${tag}`
      ))
      .orderBy(desc(spotlights.createdAt));
  }

  async updateSpotlightStatus(id: string, status: "approved" | "rejected"): Promise<Spotlight | undefined> {
    const [updated] = await db.update(spotlights).set({ status }).where(eq(spotlights.id, id)).returning();
    return updated;
  }

  // ── Artist follows ────────────────────────────────────────────────────────

  async followArtist(userId: string, artistName: string): Promise<void> {
    const exists = await this.isFollowingArtist(userId, artistName);
    if (!exists) {
      await db.insert(artistFollows).values({ userId, artistName });
    }
  }

  async unfollowArtist(userId: string, artistName: string): Promise<void> {
    await db.delete(artistFollows).where(
      and(eq(artistFollows.userId, userId), eq(artistFollows.artistName, artistName))
    );
  }

  async isFollowingArtist(userId: string, artistName: string): Promise<boolean> {
    const [row] = await db.select().from(artistFollows).where(
      and(eq(artistFollows.userId, userId), eq(artistFollows.artistName, artistName))
    );
    return !!row;
  }

  async getFollowedArtists(userId: string): Promise<string[]> {
    const rows = await db
      .select({ artistName: artistFollows.artistName })
      .from(artistFollows)
      .where(eq(artistFollows.userId, userId));
    return rows.map(r => r.artistName);
  }

  // ── User moments ──────────────────────────────────────────────────────────

  async getUserMoments(userId: string): Promise<(Moment & { user: User; song: Song })[]> {
    const rows = await db
      .select({ moment: moments, user: users, song: songs })
      .from(moments)
      .innerJoin(users, eq(moments.userId, users.id))
      .innerJoin(songs, eq(moments.songId, songs.id))
      .where(eq(moments.userId, userId))
      .orderBy(desc(moments.createdAt));
    return rows.map(r => ({ ...r.moment, user: r.user, song: r.song }));
  }

  // ── Artist upgrade requests ───────────────────────────────────────────────

  async createArtistRequest(userId: string, reason: string): Promise<ArtistRequest> {
    const [req] = await db.insert(artistRequests).values({ userId, reason }).returning();
    return req;
  }

  async getArtistRequestByUser(userId: string): Promise<ArtistRequest | undefined> {
    const [req] = await db
      .select()
      .from(artistRequests)
      .where(eq(artistRequests.userId, userId))
      .orderBy(desc(artistRequests.createdAt))
      .limit(1);
    return req;
  }

  async getPendingArtistRequests(): Promise<(ArtistRequest & { user: User })[]> {
    const rows = await db
      .select({ request: artistRequests, user: users })
      .from(artistRequests)
      .innerJoin(users, eq(artistRequests.userId, users.id))
      .where(eq(artistRequests.status, "pending"))
      .orderBy(artistRequests.createdAt);
    return rows.map(r => ({ ...r.request, user: r.user }));
  }

  async getAllArtistRequests(status?: string): Promise<(ArtistRequest & { user: User })[]> {
    const query = db
      .select({ request: artistRequests, user: users })
      .from(artistRequests)
      .innerJoin(users, eq(artistRequests.userId, users.id))
      .orderBy(desc(artistRequests.createdAt));
    const rows = status
      ? await query.where(eq(artistRequests.status, status))
      : await query;
    return rows.map(r => ({ ...r.request, user: r.user }));
  }

  async updateArtistRequest(
    id: string,
    status: "approved" | "rejected",
    adminNote?: string
  ): Promise<ArtistRequest | undefined> {
    const [updated] = await db
      .update(artistRequests)
      .set({ status, adminNote: adminNote ?? null, reviewedAt: new Date() } as any)
      .where(eq(artistRequests.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

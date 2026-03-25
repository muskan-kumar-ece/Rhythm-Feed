import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, ilike, sql, gte } from "drizzle-orm";
import pg from "pg";
import {
  users, songs, moments, behaviorLogs, songLikes, songSaves, momentLikes,
  type User, type InsertUser,
  type Song, type InsertSong,
  type Moment, type InsertMoment,
  type BehaviorLog, type InsertBehaviorLog,
} from "@shared/schema";
import type { DistributionPhase } from "./discovery";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Songs
  getSongs(): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  getSongsByMood(mood: string): Promise<Song[]>;
  searchSongs(query: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
  incrementSongStat(songId: string, field: "likes" | "comments" | "saves" | "shares"): Promise<void>;
  decrementSongStat(songId: string, field: "likes" | "saves"): Promise<void>;

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

  async getSongs(): Promise<Song[]> {
    return db.select().from(songs).orderBy(desc(songs.createdAt));
  }

  async getSong(id: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async getSongsByMood(mood: string): Promise<Song[]> {
    return db.select().from(songs).where(
      sql`${songs.features}->>'mood' ILIKE ${'%' + mood + '%'}`
    ).orderBy(desc(songs.likes));
  }

  async searchSongs(query: string): Promise<Song[]> {
    return db.select().from(songs).where(
      sql`${songs.title} ILIKE ${'%' + query + '%'} OR ${songs.artist} ILIKE ${'%' + query + '%'}`
    );
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [newSong] = await db.insert(songs).values(song).returning();
    return newSong;
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
}

export const storage = new DatabaseStorage();

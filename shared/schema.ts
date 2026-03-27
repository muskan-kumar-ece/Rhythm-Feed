import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url").notNull().default("https://i.pravatar.cc/150?u=default"),
  bio: text("bio").notNull().default(""),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  isArtist: boolean("is_artist").notNull().default(false),
  role: text("role").notNull().default("user"),   // "user" | "artist" | "admin"
  passwordHash: text("password_hash"),  // null = demo/legacy accounts
  email: text("email").unique(),
  preferences: jsonb("preferences").$type<{
    autoplay: boolean;
    audioQuality: "low" | "high";
    crossfade: boolean;
    volumeNormalization: boolean;
    dataSaver: boolean;
    pushNotifications: boolean;
    notifyNewSongs: boolean;
    notifyActivity: boolean;
  }>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  coverUrl: text("cover_url").notNull(),
  audioUrl: text("audio_url").notNull().default(""),
  mood: text("mood").notNull(),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  lyrics: jsonb("lyrics").$type<{ time: number; text: string }[]>().notNull().default(sql`'[]'::jsonb`),
  features: jsonb("features").$type<{
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
  }>().notNull().default(sql`'{}'::jsonb`),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  // Discovery boost system
  distributionScore: real("distribution_score").notNull().default(100),
  distributionPhase: text("distribution_phase").notNull().default("full"),
  // Moderation system
  status: text("status").notNull().default("approved"),
  aiTags: jsonb("ai_tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  rejectionReason: text("rejection_reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
});

export const moments = pgTable("moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  songId: varchar("song_id").notNull().references(() => songs.id),
  lyricLine: text("lyric_line").notNull(),
  mood: text("mood").notNull(),
  caption: text("caption").notNull(),
  likes: integer("likes").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const behaviorLogs = pgTable("behavior_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  songId: varchar("song_id").notNull().references(() => songs.id),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  skipped: boolean("skipped").notNull().default(false),
  liked: boolean("liked").notNull().default(false),
  replays: integer("replays").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const songLikes = pgTable("song_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  songId: varchar("song_id").notNull().references(() => songs.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const songSaves = pgTable("song_saves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  songId: varchar("song_id").notNull().references(() => songs.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const momentLikes = pgTable("moment_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  momentId: varchar("moment_id").notNull().references(() => moments.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const artistFollows = pgTable("artist_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  artistName: text("artist_name").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Artist Spotlight Interviews
export const spotlights = pgTable("spotlights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistName: text("artist_name").notNull(),
  artistAvatarUrl: text("artist_avatar_url").notNull().default("https://i.pravatar.cc/150?u=artist"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  mediaType: text("media_type").notNull().default("audio"),  // "audio" | "video"
  mediaUrl: text("media_url").notNull(),
  coverUrl: text("cover_url").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  prompt: text("prompt").notNull().default(""),          // interview prompt shown on card
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  status: text("status").notNull().default("approved"),  // pending | approved | rejected
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const spotlightLikes = pgTable("spotlight_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  spotlightId: varchar("spotlight_id").notNull().references(() => spotlights.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Artist upgrade requests submitted by regular users
export const artistRequests = pgTable("artist_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  reason: text("reason").notNull().default(""),
  status: text("status").notNull().default("pending"),  // "pending" | "approved" | "rejected"
  adminNote: text("admin_note"),                         // admin rejection note
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  reviewedAt: timestamp("reviewed_at"),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const playlistSongs = pgTable("playlist_songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").notNull().references(() => playlists.id),
  songId: varchar("song_id").notNull().references(() => songs.id),
  addedAt: timestamp("added_at").notNull().default(sql`now()`),
});

export const songComments = pgTable("song_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  songId: varchar("song_id").references(() => songs.id),
  momentId: varchar("moment_id").references(() => moments.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSongSchema = createInsertSchema(songs).omit({ id: true, createdAt: true });
export const insertMomentSchema = createInsertSchema(moments).omit({ id: true, createdAt: true });
export const insertBehaviorLogSchema = createInsertSchema(behaviorLogs).omit({ id: true, createdAt: true });
export const insertSpotlightSchema = createInsertSchema(spotlights).omit({ id: true, createdAt: true });
export const insertArtistRequestSchema = createInsertSchema(artistRequests).omit({ id: true, createdAt: true });
export const insertSongCommentSchema = createInsertSchema(songComments).omit({ id: true, createdAt: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, createdAt: true });
export const insertPlaylistSongSchema = createInsertSchema(playlistSongs).omit({ id: true, addedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSpotlight = z.infer<typeof insertSpotlightSchema>;
export type Spotlight = typeof spotlights.$inferSelect;

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;

export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type Moment = typeof moments.$inferSelect;

export type InsertBehaviorLog = z.infer<typeof insertBehaviorLogSchema>;
export type BehaviorLog = typeof behaviorLogs.$inferSelect;

export type InsertArtistRequest = z.infer<typeof insertArtistRequestSchema>;
export type ArtistRequest = typeof artistRequests.$inferSelect;

export type InsertSongComment = z.infer<typeof insertSongCommentSchema>;
export type SongComment = typeof songComments.$inferSelect;

export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;

export type InsertPlaylistSong = z.infer<typeof insertPlaylistSongSchema>;
export type PlaylistSong = typeof playlistSongs.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityId: varchar("entity_id"),
  entityType: varchar("entity_type"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type Notification = typeof notifications.$inferSelect;

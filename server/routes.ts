import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { rankSongsForUser } from "./ranking";
import { insertMomentSchema, insertBehaviorLogSchema, insertSongSchema } from "@shared/schema";
import { z } from "zod";

// For this app we use a single demo user id for all actions (no auth system yet)
const DEMO_USER_ID = "demo-user-1";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Songs ────────────────────────────────────────────────────────────────
  app.get("/api/songs", async (_req: Request, res: Response) => {
    const songs = await storage.getSongs();
    res.json(songs);
  });

  // Ranked feed: score + diversity-order songs for the demo user
  app.get("/api/songs/ranked", async (_req: Request, res: Response) => {
    const [allSongs, behaviorLogs] = await Promise.all([
      storage.getSongs(),
      storage.getUserBehaviorLogs(DEMO_USER_ID),
    ]);
    const ranked = rankSongsForUser(allSongs, behaviorLogs);
    res.json(ranked);
  });

  app.get("/api/songs/search", async (req: Request, res: Response) => {
    const query = (req.query.q as string) || "";
    if (!query) return res.json([]);
    const songs = await storage.searchSongs(query);
    res.json(songs);
  });

  app.get("/api/songs/mood/:mood", async (req: Request, res: Response) => {
    const songs = await storage.getSongsByMood(req.params.mood);
    res.json(songs);
  });

  app.get("/api/songs/:id", async (req: Request, res: Response) => {
    const song = await storage.getSong(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json(song);
  });

  app.post("/api/songs", async (req: Request, res: Response) => {
    const result = insertSongSchema.safeParse({ ...req.body, uploadedBy: DEMO_USER_ID });
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const song = await storage.createSong(result.data);
    res.status(201).json(song);
  });

  app.post("/api/songs/:id/share", async (req: Request, res: Response) => {
    await storage.incrementSongStat(req.params.id, "shares");
    res.json({ success: true });
  });

  // ── Likes ────────────────────────────────────────────────────────────────
  app.get("/api/songs/:id/liked", async (req: Request, res: Response) => {
    const liked = await storage.isLiked(DEMO_USER_ID, req.params.id);
    res.json({ liked });
  });

  app.post("/api/songs/:id/like", async (req: Request, res: Response) => {
    await storage.likeSong(DEMO_USER_ID, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/songs/:id/like", async (req: Request, res: Response) => {
    await storage.unlikeSong(DEMO_USER_ID, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/user/liked-songs", async (_req: Request, res: Response) => {
    const songs = await storage.getLikedSongs(DEMO_USER_ID);
    res.json(songs);
  });

  // ── Saves ────────────────────────────────────────────────────────────────
  app.get("/api/songs/:id/saved", async (req: Request, res: Response) => {
    const saved = await storage.isSaved(DEMO_USER_ID, req.params.id);
    res.json({ saved });
  });

  app.post("/api/songs/:id/save", async (req: Request, res: Response) => {
    await storage.saveSong(DEMO_USER_ID, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/songs/:id/save", async (req: Request, res: Response) => {
    await storage.unsaveSong(DEMO_USER_ID, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/user/saved-songs", async (_req: Request, res: Response) => {
    const songs = await storage.getSavedSongs(DEMO_USER_ID);
    res.json(songs);
  });

  // ── Moments ──────────────────────────────────────────────────────────────
  app.get("/api/moments", async (_req: Request, res: Response) => {
    const moments = await storage.getMoments();
    res.json(moments);
  });

  app.post("/api/moments", async (req: Request, res: Response) => {
    const result = insertMomentSchema.safeParse({ ...req.body, userId: DEMO_USER_ID });
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const moment = await storage.createMoment(result.data);
    res.status(201).json(moment);
  });

  app.post("/api/moments/:id/like", async (req: Request, res: Response) => {
    await storage.likeMoment(DEMO_USER_ID, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/moments/:id/like", async (req: Request, res: Response) => {
    await storage.unlikeMoment(DEMO_USER_ID, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/moments/:id/liked", async (req: Request, res: Response) => {
    const liked = await storage.isMomentLiked(DEMO_USER_ID, req.params.id);
    res.json({ liked });
  });

  // ── Behavior Logging ─────────────────────────────────────────────────────
  app.post("/api/behavior", async (req: Request, res: Response) => {
    const result = insertBehaviorLogSchema.safeParse({ ...req.body, userId: DEMO_USER_ID });
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const log = await storage.logBehavior(result.data);
    res.status(201).json(log);
  });

  app.get("/api/behavior", async (_req: Request, res: Response) => {
    const logs = await storage.getUserBehaviorLogs(DEMO_USER_ID);
    res.json(logs);
  });

  // ── User / Profile ───────────────────────────────────────────────────────
  app.get("/api/user/profile", async (_req: Request, res: Response) => {
    const user = await storage.getUser(DEMO_USER_ID);
    res.json(user);
  });

  app.get("/api/user/history", async (_req: Request, res: Response) => {
    const logs = await storage.getUserBehaviorLogs(DEMO_USER_ID);
    res.json(logs);
  });

  // ── Artist / Studio ──────────────────────────────────────────────────────
  app.get("/api/artist/songs", async (_req: Request, res: Response) => {
    const artistSongs = await storage.getArtistSongs(DEMO_USER_ID);
    res.json(artistSongs);
  });

  return httpServer;
}

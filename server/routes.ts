import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { rankSongsForUser } from "./ranking";
import { insertMomentSchema, insertBehaviorLogSchema, insertSongSchema } from "@shared/schema";
import {
  evaluateSongDistribution,
  computeMetrics,
  classifyEngagement,
  scoreToPhase,
  NEW_SONG_SCORE,
  NEW_SONG_PHASE,
} from "./discovery";
import { analyzeTrack } from "./aiAnalysis";
import {
  hashPassword, comparePassword,
  setAuthCookie, clearAuthCookie, getTokenFromRequest,
  attachUser, requireRole,
} from "./auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Fallback demo user id used when no auth token is present
const DEMO_USER_ID = "demo-user-1";

/** Returns the authenticated user's ID, or falls back to the demo user */
function userId(req: Request): string {
  return (req as any).user?.userId ?? DEMO_USER_ID;
}

// ── Multer — file upload config ───────────────────────────────────────────────

const UPLOAD_ROOT = path.resolve("uploads");
const AUDIO_DIR   = path.join(UPLOAD_ROOT, "audio");
const COVER_DIR   = path.join(UPLOAD_ROOT, "covers");
[AUDIO_DIR, COVER_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const MAX_AUDIO_MB = 100;
const MAX_IMG_MB   = 8;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, file.fieldname === "audio" ? AUDIO_DIR : COVER_DIR);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_AUDIO_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "audio") {
      if (/^audio\/(mpeg|wav|x-wav|mp3|flac|x-flac)/.test(file.mimetype) ||
          /\.(mp3|wav|flac)$/i.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error("Audio must be MP3, WAV, or FLAC"));
      }
    } else {
      if (/^image\//.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Cover must be an image file"));
      }
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded files statically
  app.use("/uploads", express.static(UPLOAD_ROOT));

  // Attach auth user to every request (non-blocking)
  app.use(attachUser);

  // ── Auth ─────────────────────────────────────────────────────────────────

  const signupSchema = z.object({
    username:    z.string().min(2).max(30).regex(/^[a-z0-9_]+$/i, "Letters, numbers, underscores only"),
    email:       z.string().email().optional().or(z.literal("")),
    password:    z.string().min(6),
    displayName: z.string().min(1).max(60),
  });

  const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });

  // POST /api/auth/signup
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
    }
    const { username, email, password, displayName } = parsed.data;

    // Check username uniqueness
    const existing = await storage.getUserByUsername(username.toLowerCase());
    if (existing) return res.status(409).json({ message: "Username already taken" });

    // Check email uniqueness if provided
    const emailVal = email && email.trim() !== "" ? email.toLowerCase() : undefined;
    if (emailVal) {
      const byEmail = await storage.getUserByEmail(emailVal);
      if (byEmail) return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await hashPassword(password);
    const user = await storage.createUser({
      username:    username.toLowerCase(),
      displayName,
      avatarUrl:   `https://i.pravatar.cc/150?u=${encodeURIComponent(username)}`,
      bio:         "",
      isArtist:    false,
      passwordHash,
      email:       emailVal ?? null,
    } as any);

    const role = (user as any).role ?? "user";
    setAuthCookie(res, { userId: user.id, username: user.username, role });
    return res.status(201).json({
      id:          user.id,
      username:    user.username,
      displayName: user.displayName,
      avatarUrl:   user.avatarUrl,
      bio:         user.bio,
      email:       (user as any).email ?? null,
      isArtist:    user.isArtist,
      role,
    });
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const { username, password } = parsed.data;

    const user = await storage.getUserByUsername(username.toLowerCase());
    if (!user) return res.status(401).json({ message: "Invalid username or password" });

    // Demo accounts without a password hash: accept any password == "demo1234"
    if (!user.passwordHash) {
      if (password !== "demo1234") return res.status(401).json({ message: "Invalid username or password" });
    } else {
      const ok = await comparePassword(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid username or password" });
    }

    const role = (user as any).role ?? "user";
    setAuthCookie(res, { userId: user.id, username: user.username, role });
    return res.json({
      id:          user.id,
      username:    user.username,
      displayName: user.displayName,
      avatarUrl:   user.avatarUrl,
      bio:         user.bio,
      email:       (user as any).email ?? null,
      isArtist:    user.isArtist,
      role,
    });
  });

  // GET /api/auth/me — returns current user or 401
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const payload = getTokenFromRequest(req);
    if (!payload) return res.status(401).json({ message: "Not authenticated" });

    const user = await storage.getUser(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    return res.json({
      id:          user.id,
      username:    user.username,
      displayName: user.displayName,
      avatarUrl:   user.avatarUrl,
      bio:         user.bio,
      email:       (user as any).email ?? null,
      isArtist:    user.isArtist,
      role:        (user as any).role ?? "user",
    });
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    clearAuthCookie(res);
    return res.json({ success: true });
  });

  // POST /api/auth/change-password — requires a valid auth cookie
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    const payload = getTokenFromRequest(req);
    if (!payload) return res.status(401).json({ message: "Unauthorised" });

    const schema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword:     z.string().min(6, "New password must be at least 6 characters"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await storage.getUser(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Verify current password (demo accounts use "demo1234")
    if (!user.passwordHash) {
      if (currentPassword !== "demo1234") {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
    } else {
      const ok = await comparePassword(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    const newHash = await hashPassword(newPassword);
    await storage.updateUserAuth(payload.userId, { passwordHash: newHash });

    // Re-issue a fresh token so the session stays alive (preserve role)
    setAuthCookie(res, { userId: user.id, username: user.username, role: (user as any).role ?? "user" });
    return res.json({ success: true });
  });

  // ── Songs ────────────────────────────────────────────────────────────────
  app.get("/api/songs", async (_req: Request, res: Response) => {
    const songs = await storage.getSongs();
    res.json(songs);
  });

  // Ranked feed: score + diversity-order songs for the demo user
  // Accepts optional ?ctx=<url-encoded-json> (SessionContext from the client)
  app.get("/api/songs/ranked", async (req: Request, res: Response) => {
    const [allSongs, behaviorLogs] = await Promise.all([
      storage.getSongs(),
      storage.getUserBehaviorLogs(DEMO_USER_ID),
    ]);

    let sessionCtx: Parameters<typeof rankSongsForUser>[2] = undefined;
    try {
      const rawCtx = req.query.ctx as string | undefined;
      if (rawCtx) sessionCtx = JSON.parse(decodeURIComponent(rawCtx));
    } catch {
      // Malformed ctx — proceed without session context
    }

    const ranked = rankSongsForUser(allSongs, behaviorLogs, sessionCtx);
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
    // New songs enter the discovery pipeline at test phase — small audience first
    const song = await storage.createSong({
      ...result.data,
      distributionScore: NEW_SONG_SCORE,
      distributionPhase: NEW_SONG_PHASE,
    });
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

  app.post("/api/moments/:id/comment", async (req: Request, res: Response) => {
    await storage.commentMoment(req.params.id);
    res.json({ success: true });
  });

  // ── Behavior Logging ─────────────────────────────────────────────────────
  app.post("/api/behavior", async (req: Request, res: Response) => {
    const result = insertBehaviorLogSchema.safeParse({ ...req.body, userId: DEMO_USER_ID });
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const log = await storage.logBehavior(result.data);
    res.status(201).json(log);

    // Fire-and-forget: re-evaluate distribution for this song after new signal
    const song = await storage.getSong(result.data.songId);
    if (song && song.distributionPhase !== "full") {
      evaluateSongDistribution(
        song.id,
        song.distributionScore,
        song.distributionPhase as any,
        storage
      ).catch(err => console.error("[discovery] evaluation error:", err));
    }
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

  // All songs for the authenticated artist (any status: pending/approved/rejected)
  app.get("/api/artist/songs", async (_req: Request, res: Response) => {
    const artistSongs = await storage.getArtistSongsAll(DEMO_USER_ID);
    res.json(artistSongs);
  });

  // Per-song stats for the artist
  app.get("/api/artist/songs/:id/stats", async (req: Request, res: Response) => {
    const stats = await storage.getSongStats(req.params.id);
    res.json(stats);
  });

  // Edit song metadata (only pending songs)
  app.put("/api/artist/songs/:id/metadata", async (req: Request, res: Response) => {
    const song = await storage.getSong(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });
    const { title, artist, mood, genre, tempo, energy, lyricsText } = req.body;
    const parsedLyrics = lyricsText
      ? (lyricsText as string).split("\n").filter((l: string) => l.trim()).map((text: string, i: number) => ({ time: i * 3, text }))
      : undefined;
    const features = song.features ? {
      ...song.features,
      tempo:  tempo  ?? song.features.tempo,
      energy: energy ?? song.features.energy,
      genre:  genre  ? [genre] : song.features.genre,
    } : undefined;
    const updated = await storage.updateSongMetadata(song.id, {
      ...(title   && { title }),
      ...(artist  && { artist }),
      ...(mood    && { mood }),
      ...(features && { features }),
      ...(parsedLyrics && { lyrics: parsedLyrics }),
    });
    res.json(updated);
  });

  // ── Upload — multipart audio + cover ─────────────────────────────────────
  app.post(
    "/api/upload",
    requireRole("artist", "admin"),
    upload.fields([
      { name: "audio", maxCount: 1 },
      { name: "cover", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const audioFile = files?.["audio"]?.[0];
      const coverFile = files?.["cover"]?.[0];

      if (!audioFile) return res.status(400).json({ message: "Audio file is required" });

      const { title, artist, mood, genre, tempo, energy, lyricsText } = req.body;
      if (!title || !artist || !mood) {
        // Clean up uploaded files on validation error
        if (audioFile) fs.unlink(audioFile.path, () => {});
        if (coverFile) fs.unlink(coverFile.path, () => {});
        return res.status(400).json({ message: "title, artist, and mood are required" });
      }

      const audioUrl = `/uploads/audio/${audioFile.filename}`;
      const coverUrl = coverFile
        ? `/uploads/covers/${coverFile.filename}`
        : "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=500";

      // AI analysis
      const analysis = analyzeTrack({
        title,
        artist,
        genre:  genre  ?? "pop",
        mood:   mood   ?? "chill",
        tempo:  (tempo  ?? "medium") as "slow" | "medium" | "fast",
        energy: (energy ?? "medium") as "low" | "medium" | "high",
        fileSizeBytes: audioFile.size,
      });

      // Parse optional lyrics
      const parsedLyrics = lyricsText
        ? (lyricsText as string).split("\n").filter((l: string) => l.trim()).map((text: string, i: number) => ({ time: i * 3, text }))
        : [{ time: 0, text: "(Instrumental)" }];

      // Build mood tags
      const moodTags = mood ? [mood, ...analysis.moodCategories.filter(m => m !== mood)] : analysis.moodCategories;
      const uniqueMoods = Array.from(new Set(moodTags));

      const song = await storage.createSong({
        title,
        artist,
        coverUrl,
        audioUrl,
        mood,
        status: "pending",
        aiTags: analysis.aiTags,
        distributionScore: NEW_SONG_SCORE,
        distributionPhase: NEW_SONG_PHASE,
        uploadedBy: userId(req),
        features: {
          tempo:  analysis.tempo,
          energy: analysis.energy,
          genre:  genre ? [genre] : ["pop"],
          mood:   uniqueMoods,
          popularity: {
            plays: 0, likes: 0, replays: 0, completions: 0, shares: 0,
            recent24h: { plays: 0, likes: 0, replays: 0, comments: 0 },
          },
        },
        lyrics: parsedLyrics,
      });

      res.status(201).json({ song, analysis });
    }
  );

  // ── Moderation — admin endpoints (admin-only) ─────────────────────────────
  // Single middleware guard for every route under /api/admin
  app.use("/api/admin", requireRole("admin"));

  // PATCH /api/admin/users/:id/role — promote / demote any user
  app.patch("/api/admin/users/:id/role", async (req: Request, res: Response) => {
    const { role } = req.body;
    if (!["user", "artist", "admin"].includes(role)) {
      return res.status(400).json({ message: "role must be user, artist, or admin" });
    }
    try {
      await storage.updateUserRole(req.params.id, role);
      return res.json({ success: true, role });
    } catch {
      return res.status(404).json({ message: "User not found" });
    }
  });

  app.get("/api/admin/pending", async (_req: Request, res: Response) => {
    const pending = await storage.getPendingSongs();
    res.json(pending);
  });

  // All admin songs with optional ?status= filter
  app.get("/api/admin/songs", async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const result = await storage.getAdminSongs(status);
    res.json(result);
  });

  // Artist upload count
  app.get("/api/admin/artist-uploads", async (req: Request, res: Response) => {
    const artistName = req.query.artist as string;
    if (!artistName) return res.status(400).json({ message: "artist param required" });
    const count = await storage.getArtistUploadCount(artistName);
    res.json({ count });
  });

  // Update song metadata (admin path)
  app.put("/api/admin/songs/:id/metadata", async (req: Request, res: Response) => {
    const song = await storage.getSong(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });
    const { title, artist, mood, genre } = req.body;
    const features = song.features && genre ? { ...song.features, genre: [genre] } : song.features;
    const updated = await storage.updateSongMetadata(song.id, {
      ...(title  && { title }),
      ...(artist && { artist }),
      ...(mood   && { mood }),
      ...(features && { features }),
    });
    res.json(updated);
  });

  app.post("/api/admin/songs/:id/approve", async (req: Request, res: Response) => {
    const song = await storage.updateSongStatus(req.params.id, "approved");
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json({ success: true, song });
  });

  app.post("/api/admin/songs/:id/reject", async (req: Request, res: Response) => {
    const reason = (req.body.reason as string) || "Does not meet content guidelines";
    const song = await storage.updateSongStatus(req.params.id, "rejected", reason);
    if (!song) return res.status(404).json({ message: "Song not found" });
    res.json({ success: true, song });
  });

  // Bulk approve
  app.post("/api/admin/songs/bulk-approve", async (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
    const results = await Promise.allSettled(ids.map(id => storage.updateSongStatus(id, "approved")));
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    res.json({ success: true, succeeded, total: ids.length });
  });

  // Bulk reject
  app.post("/api/admin/songs/bulk-reject", async (req: Request, res: Response) => {
    const { ids, reason } = req.body as { ids: string[]; reason?: string };
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
    const rejectReason = reason || "Does not meet content guidelines";
    const results = await Promise.allSettled(ids.map(id => storage.updateSongStatus(id, "rejected", rejectReason)));
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    res.json({ success: true, succeeded, total: ids.length });
  });

  // ── AI DJ Session ─────────────────────────────────────────────────────────
  // Analyzes recent behavior (or onboarding prefs for first-time users) to
  // craft a personalized greeting + curated playlist.
  app.get("/api/ai-dj/session", async (req: Request, res: Response) => {
    // Parse optional onboarding prefs sent by first-time users
    let onboardingPrefs: { moods: string[]; genres: string[] } | null = null;
    if (req.query.prefs) {
      try { onboardingPrefs = JSON.parse(req.query.prefs as string); } catch { /* ignore */ }
    }

    const [allSongs, logs] = await Promise.all([
      storage.getSongs(),
      storage.getUserBehaviorLogs(DEMO_USER_ID),
    ]);

    const hour = new Date().getHours();
    let timeOfDay: "morning" | "afternoon" | "evening" | "latenight";
    if (hour >= 5 && hour < 12)       timeOfDay = "morning";
    else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
    else if (hour >= 17 && hour < 21) timeOfDay = "evening";
    else                               timeOfDay = "latenight";

    const recentLogs  = logs.slice(0, 30);
    const hasHistory  = recentLogs.length >= 3;
    const isColdStart = onboardingPrefs !== null && !hasHistory;

    // ── Mood signal ─────────────────────────────────────────────────────────
    // For cold start: use onboarding prefs directly.
    // For returning users: derive from behavior logs.
    let topMoods:    string[];
    let primaryMood: string;

    if (isColdStart && onboardingPrefs) {
      topMoods    = onboardingPrefs.moods.slice(0, 3);
      primaryMood = topMoods[0]?.toLowerCase() ?? "chill";
    } else {
      const moodWeight: Record<string, number> = {};
      const songMap = new Map(allSongs.map(s => [s.id, s]));
      for (const log of recentLogs) {
        const song = songMap.get(log.songId);
        if (!song || log.skipped) continue;
        const weight = log.liked ? 2 : 1;
        for (const m of song.features?.mood ?? []) {
          moodWeight[m] = (moodWeight[m] || 0) + weight;
        }
      }
      topMoods    = Object.entries(moodWeight).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
      primaryMood = topMoods[0]?.toLowerCase() ?? "chill";
    }

    // ── Greeting template matrix ────────────────────────────────────────────
    type GreetingDef = { greeting: string; theme: string };

    // Cold start greetings — shown after onboarding ("We built your vibe")
    const coldStartGreetings: Record<string, GreetingDef> = {
      chill:        { greeting: `We built your vibe in seconds — your ${topMoods[0] || "Chill"} starter set is ready`,       theme: `${topMoods[0] || "Chill"} Starter` },
      focus:        { greeting: `We built your vibe in seconds — diving into ${topMoods[0] || "Focus"} mode`,                 theme: `${topMoods[0] || "Focus"} Starter` },
      hype:         { greeting: `We built your vibe in seconds — let's get you hyped`,                                        theme: "Hype Starter" },
      gym:          { greeting: `We built your vibe in seconds — power up playlist incoming`,                                  theme: "Gym Starter" },
      "night drive":{ greeting: `We built your vibe in seconds — cinematic night drive ready`,                                 theme: "Night Drive Starter" },
      sad:          { greeting: `We built your vibe in seconds — a set that feels exactly right`,                              theme: "Feels Starter" },
      study:        { greeting: `We built your vibe in seconds — zero distractions, pure focus`,                               theme: "Study Starter" },
      default:      { greeting: `We built your vibe in seconds — here's your personalized starter set`,                       theme: `${topMoods[0] || "Vibe"} Starter` },
    };

    const templates: Record<string, Record<string, GreetingDef>> = {
      morning: {
        focus:      { greeting: "Rise and grind — your morning focus set",              theme: "Morning Focus" },
        hype:       { greeting: "Good morning energy — wake up and go",                  theme: "Morning Hype" },
        study:      { greeting: "Early bird session — get in the zone",                  theme: "Morning Study" },
        default:    { greeting: "Good morning — here's a fresh start",                  theme: "Morning Mix" },
      },
      afternoon: {
        focus:      { greeting: "Afternoon deep work — stay locked in",                 theme: "Afternoon Focus" },
        chill:      { greeting: "Midday chill — take a breath",                         theme: "Afternoon Chill" },
        study:      { greeting: "Study session loaded — no distractions",               theme: "Afternoon Study" },
        gym:        { greeting: "Midday grind — power through",                         theme: "Afternoon Gym" },
        default:    { greeting: "Here's your afternoon soundtrack",                     theme: "Afternoon Mix" },
      },
      evening: {
        chill:         { greeting: "Unwind time — your evening vibe mix",               theme: "Evening Chill" },
        "night drive": { greeting: "Golden hour to night drive — a cinematic journey",  theme: "Night Drive" },
        sad:           { greeting: "Feeling something tonight — let it out",            theme: "Evening Feels" },
        hype:          { greeting: "Evening energy — let's go",                         theme: "Evening Hype" },
        default:       { greeting: "Wind down your day the right way",                  theme: "Evening Session" },
      },
      latenight: {
        chill:         { greeting: "Here's your late night chill mix",                  theme: "Late Night Chill" },
        focus:         { greeting: "Late night focus — locked in while the world sleeps", theme: "Late Night Focus" },
        sad:           { greeting: "For the quiet hours — a late night feels playlist", theme: "Late Night Feels" },
        "night drive": { greeting: "It's late, the roads are yours",                    theme: "Night Drive" },
        default:       { greeting: "Late night VibeScroll — just you and the music",    theme: "Late Night" },
      },
    };

    let greeting: string;
    let theme:    string;

    if (isColdStart && onboardingPrefs) {
      const tpl = coldStartGreetings[primaryMood] ?? coldStartGreetings["default"];
      greeting  = tpl.greeting;
      theme     = tpl.theme;
    } else if (hasHistory) {
      const tpl = templates[timeOfDay][primaryMood] ?? templates[timeOfDay]["default"];
      greeting  = tpl.greeting;
      theme     = tpl.theme;
    } else {
      greeting  = "Welcome to VibeScroll — here's what's hot right now";
      theme     = "Trending Now";
    }

    // ── Build session context for playlist ranking ──────────────────────────
    const sessionCtx = isColdStart && onboardingPrefs
      ? {
          recentSongIds:  [] as string[],
          sessionMoods:   onboardingPrefs.moods,
          sessionGenres:  onboardingPrefs.genres,
          sessionEnergy:  "medium",
          energyDrift:    "stable",
          sessionLength:  5,
          startedAt:      Date.now(),
          isColdStart:    true as const,
          onboardingPrefs,
          negativePreferences: { moods: {} as Record<string, number>, genres: {} as Record<string, number> },
          replayBoosts:        { moods: {} as Record<string, number>, genres: {} as Record<string, number> },
        }
      : undefined;

    // ── Curate 8 songs for the DJ playlist ─────────────────────────────────
    const ranked = rankSongsForUser(allSongs, logs, sessionCtx);
    const moodMatched = ranked.filter(s =>
      s.features?.mood?.some(m => m.toLowerCase() === primaryMood)
    );
    const rest = ranked.filter(s =>
      !s.features?.mood?.some(m => m.toLowerCase() === primaryMood)
    );
    const playlist = [...moodMatched, ...rest].slice(0, 8);

    res.json({
      greeting,
      theme,
      timeOfDay,
      dominantMood: primaryMood,
      hasHistory,
      topMoods,
      playlist,
    });
  });

  // ── Moments — trending + discovery ───────────────────────────────────────
  app.get("/api/moments/trending", async (_req: Request, res: Response) => {
    const moments = await storage.getTrendingMoments();
    res.json(moments);
  });

  app.get("/api/moments/discover-songs", async (_req: Request, res: Response) => {
    const songs = await storage.getSongsFromMoments();
    res.json(songs);
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  app.get("/api/analytics/retention/:songId", async (req: Request, res: Response) => {
    const data = await storage.getAnalyticsRetention(req.params.songId);
    res.json(data);
  });

  app.get("/api/analytics/mood-breakdown", async (_req: Request, res: Response) => {
    const data = await storage.getAnalyticsMoodBreakdown();
    res.json(data);
  });

  app.get("/api/analytics/hourly", async (_req: Request, res: Response) => {
    const data = await storage.getAnalyticsHourly();
    res.json(data);
  });

  app.get("/api/analytics/growth", async (_req: Request, res: Response) => {
    const data = await storage.getAnalyticsGrowth();
    res.json(data);
  });

  // ── Discovery / Distribution ──────────────────────────────────────────────
  // Status for a single song (used by artist studio)
  app.get("/api/songs/:id/distribution", async (req: Request, res: Response) => {
    const song = await storage.getSong(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    const logs  = await storage.getSongBehaviorLogs(song.id);
    const metrics = logs.length >= 3 ? computeMetrics(logs) : null;
    const engagement = metrics ? classifyEngagement(metrics) : null;

    res.json({
      songId:    song.id,
      score:     song.distributionScore,
      phase:     song.distributionPhase,
      totalLogs: logs.length,
      engagement,
      metrics,
    });
  });

  // Catalogue-wide distribution overview (artist dashboard)
  app.get("/api/discovery/stats", async (_req: Request, res: Response) => {
    const allSongs = await storage.getSongs();

    const stats = await Promise.all(allSongs.map(async song => {
      const logs    = await storage.getSongBehaviorLogs(song.id);
      const metrics = logs.length >= 3 ? computeMetrics(logs) : null;
      const engagement = metrics ? classifyEngagement(metrics) : null;
      return {
        songId:    song.id,
        title:     song.title,
        artist:    song.artist,
        score:     song.distributionScore,
        phase:     song.distributionPhase,
        totalLogs: logs.length,
        engagement,
        metrics,
      };
    }));

    res.json(stats);
  });

  // ── Trending ─────────────────────────────────────────────────────────────
  app.get("/api/trending/viral", async (_req: Request, res: Response) => {
    const songs = await storage.getTrendingViral(10);
    res.json(songs);
  });

  app.get("/api/trending/fastest", async (_req: Request, res: Response) => {
    const songs = await storage.getTrendingFastest(10);
    res.json(songs);
  });

  app.get("/api/trending/moments-songs", async (_req: Request, res: Response) => {
    const songs = await storage.getTrendingMomentSongs(10);
    res.json(songs);
  });

  // ── Song Moments ───────────────────────────────────────────────────────────
  app.get("/api/songs/:id/moments", async (req: Request, res: Response) => {
    const moments = await storage.getSongMoments(req.params.id);
    res.json(moments);
  });

  // ── AI DJ — Next Song ─────────────────────────────────────────────────────
  app.post("/api/ai-dj/next", async (req: Request, res: Response) => {
    const { excludeIds = [], sessionCtx } = req.body as { excludeIds?: string[]; sessionCtx?: Parameters<typeof rankSongsForUser>[2] };
    const [allSongs, logs] = await Promise.all([
      storage.getSongs(),
      storage.getUserBehaviorLogs(DEMO_USER_ID),
    ]);

    const ranked = rankSongsForUser(allSongs, logs, sessionCtx ?? undefined);
    const candidates = ranked.filter(s => !excludeIds.includes(s.id));
    const next = candidates[0];

    if (!next) return res.status(404).json({ message: "No songs available" });

    const moods: string[] = next.features?.mood ?? [];
    const genres: string[] = next.features?.genre ?? [];
    const sessionMoods: string[] = (sessionCtx as { sessionMoods?: string[] } | undefined)?.sessionMoods ?? [];
    const matchedMood = moods.find(m => sessionMoods.map(x => x.toLowerCase()).includes(m.toLowerCase()));
    const reason = matchedMood
      ? `Continuing your ${matchedMood} session`
      : genres[0]
        ? `Selected for your ${genres[0]} taste`
        : "Picked for your vibe";

    res.json({ song: next, reason });
  });

  // ── Admin Analytics ───────────────────────────────────────────────────────
  app.get("/api/admin/stats", async (_req: Request, res: Response) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get("/api/admin/daily-activity", async (_req: Request, res: Response) => {
    const data = await storage.getAdminDailyActivity(14);
    res.json(data);
  });

  app.get("/api/admin/retention", async (_req: Request, res: Response) => {
    const data = await storage.getAdminRetentionData();
    res.json(data);
  });

  // ── Artist follows ────────────────────────────────────────────────────────
  app.get("/api/artists/followed", async (req: Request, res: Response) => {
    const artistName = req.query.artistName as string;
    if (!artistName) return res.status(400).json({ message: "artistName required" });
    const following = await storage.isFollowingArtist(DEMO_USER_ID, artistName);
    res.json({ following });
  });

  app.post("/api/artists/follow", async (req: Request, res: Response) => {
    const { artistName } = req.body;
    if (!artistName) return res.status(400).json({ message: "artistName required" });
    await storage.followArtist(DEMO_USER_ID, artistName);
    res.json({ success: true, following: true });
  });

  app.delete("/api/artists/follow", async (req: Request, res: Response) => {
    const { artistName } = req.body;
    if (!artistName) return res.status(400).json({ message: "artistName required" });
    await storage.unfollowArtist(DEMO_USER_ID, artistName);
    res.json({ success: true, following: false });
  });

  app.get("/api/artists/following", async (_req: Request, res: Response) => {
    const artists = await storage.getFollowedArtists(DEMO_USER_ID);
    res.json(artists);
  });

  // ── User moments ──────────────────────────────────────────────────────────
  app.get("/api/user/moments", async (_req: Request, res: Response) => {
    const userMoments = await storage.getUserMoments(DEMO_USER_ID);
    res.json(userMoments);
  });

  // ── Artist Spotlights ─────────────────────────────────────────────────────

  // List approved spotlights
  app.get("/api/spotlights", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const tag   = req.query.tag as string | undefined;
    const artist = req.query.artist as string | undefined;

    if (artist) {
      return res.json(await storage.getArtistSpotlights(artist));
    }
    if (tag) {
      return res.json(await storage.getSpotlightsByTag(tag));
    }
    res.json(await storage.getSpotlights(limit));
  });

  // Single spotlight
  app.get("/api/spotlights/:id", async (req: Request, res: Response) => {
    const spot = await storage.getSpotlight(req.params.id);
    if (!spot) return res.status(404).json({ message: "Not found" });
    res.json(spot);
  });

  // Record a view
  app.post("/api/spotlights/:id/view", async (req: Request, res: Response) => {
    await storage.incrementSpotlightView(req.params.id);
    res.json({ success: true });
  });

  // Like / unlike
  app.get("/api/spotlights/:id/liked", async (req: Request, res: Response) => {
    const liked = await storage.isSpotlightLiked(DEMO_USER_ID, req.params.id);
    res.json({ liked });
  });

  app.post("/api/spotlights/:id/like", async (req: Request, res: Response) => {
    await storage.likeSpotlight(DEMO_USER_ID, req.params.id);
    res.json({ success: true, liked: true });
  });

  app.delete("/api/spotlights/:id/like", async (req: Request, res: Response) => {
    await storage.unlikeSpotlight(DEMO_USER_ID, req.params.id);
    res.json({ success: true, liked: false });
  });

  // Upload spotlight (audio or video clip) — artist or admin only
  app.post(
    "/api/spotlights/upload",
    requireRole("artist", "admin"),
    upload.fields([
      { name: "media", maxCount: 1 },
      { name: "cover", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const mediaFile = files?.["media"]?.[0];
      const coverFile = files?.["cover"]?.[0];

      if (!mediaFile) return res.status(400).json({ message: "Media file is required" });

      const { artistName, title, description, prompt, tags, durationSeconds } = req.body;
      if (!artistName || !title) {
        if (mediaFile) fs.unlink(mediaFile.path, () => {});
        if (coverFile)  fs.unlink(coverFile.path, () => {});
        return res.status(400).json({ message: "artistName and title are required" });
      }

      const isVideo   = /\.(mp4|mov|webm)$/i.test(mediaFile.originalname) || mediaFile.mimetype.startsWith("video/");
      const mediaUrl  = `/uploads/${isVideo ? "audio" : "audio"}/${mediaFile.filename}`;
      const coverUrl  = coverFile
        ? `/uploads/covers/${coverFile.filename}`
        : `https://i.pravatar.cc/400?u=${encodeURIComponent(artistName)}`;

      const parsedTags = tags ? (Array.isArray(tags) ? tags : String(tags).split(",").map((t: string) => t.trim()).filter(Boolean)) : [];

      const spotlight = await storage.createSpotlight({
        artistName,
        artistAvatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(artistName)}`,
        title,
        description:     description ?? "",
        mediaType:       isVideo ? "video" : "audio",
        mediaUrl,
        coverUrl,
        durationSeconds: parseInt(durationSeconds) || 0,
        tags:            parsedTags,
        prompt:          prompt ?? "",
        uploadedBy:      userId(req),
        status:          "pending",
      });

      res.status(201).json({ spotlight });
    }
  );

  return httpServer;
}

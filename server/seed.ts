import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users, songs, moments } from "../shared/schema";
import { eq } from "drizzle-orm";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const DEMO_USER_ID = "demo-user-1";

async function seed() {
  console.log("Seeding database...");

  // Create demo user
  const existing = await db.select().from(users).where(eq(users.id, DEMO_USER_ID));
  if (existing.length === 0) {
    await db.insert(users).values({
      id: DEMO_USER_ID,
      username: "vibescroller",
      displayName: "Vibe Scroller",
      avatarUrl: "https://i.pravatar.cc/150?u=vibescroller",
      bio: "Music is life. 🎵",
      isArtist: true,
      followers: 1204,
      following: 342,
    });
    console.log("Created demo user");
  }

  // Create other users for moments
  const otherUsers = [
    { id: "u-alex", username: "alexvibes", displayName: "Alex Vibes", avatarUrl: "https://i.pravatar.cc/150?u=alex" },
    { id: "u-sarah", username: "sarahcode", displayName: "Sarah Code", avatarUrl: "https://i.pravatar.cc/150?u=sarah" },
    { id: "u-jake", username: "jakefitness", displayName: "Jake Fitness", avatarUrl: "https://i.pravatar.cc/150?u=jake" },
  ];
  for (const u of otherUsers) {
    const ex = await db.select().from(users).where(eq(users.id, u.id));
    if (ex.length === 0) {
      await db.insert(users).values({ ...u, displayName: u.displayName });
    }
  }

  // Seed songs
  const existingSongs = await db.select().from(songs);
  if (existingSongs.length === 0) {
    const songData = [
      {
        id: "song-1",
        title: "Midnight Drive",
        artist: "Neon Waves",
        coverUrl: "https://images.unsplash.com/photo-1518972734183-c55bba57cdac?w=400&h=400&fit=crop",
        audioUrl: "",
        mood: "Focus",
        likes: 12400,
        comments: 342,
        saves: 890,
        shares: 210,
        lyrics: [
          { time: 0, text: "Cruising down the empty street" },
          { time: 3, text: "Neon lights and synthetic beat" },
          { time: 6, text: "Lost in the rhythm of the night" },
          { time: 9, text: "Everything is feeling right" },
        ],
        features: {
          tempo: "medium",
          energy: "medium",
          genre: ["Synthwave", "Electronic", "Retrowave"],
          mood: ["Focus", "Night Drive", "Nostalgic"],
          popularity: {
            plays: 45000, likes: 12400, replays: 3200, completions: 28000, shares: 210,
            recent24h: { plays: 5000, likes: 1200, replays: 400, comments: 80 },
          },
        },
        uploadedBy: DEMO_USER_ID,
      },
      {
        id: "song-2",
        title: "Late Night Studies",
        artist: "ChillHop Beats",
        coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
        audioUrl: "",
        mood: "Study",
        likes: 45200,
        comments: 1205,
        saves: 5600,
        shares: 1150,
        lyrics: [
          { time: 0, text: "Rain tapping on the glass" },
          { time: 3, text: "Watching the hours pass" },
          { time: 6, text: "Coffee cold but mind awake" },
          { time: 9, text: "For another memory to make" },
        ],
        features: {
          tempo: "slow",
          energy: "low",
          genre: ["Lofi", "Hip Hop", "Chill"],
          mood: ["Study", "Relax", "Sad", "Cozy"],
          popularity: {
            plays: 120000, likes: 45200, replays: 15400, completions: 85000, shares: 1150,
            recent24h: { plays: 1500, likes: 300, replays: 200, comments: 10 },
          },
        },
        uploadedBy: null,
      },
      {
        id: "song-3",
        title: "Heavy Thoughts",
        artist: "The Rain",
        coverUrl: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=400&h=400&fit=crop",
        audioUrl: "",
        mood: "Sad",
        likes: 8900,
        comments: 89,
        saves: 430,
        shares: 55,
        lyrics: [
          { time: 0, text: "I can't seem to find the words" },
          { time: 3, text: "In this quiet, lonely world" },
          { time: 6, text: "Shadows dancing on the wall" },
          { time: 9, text: "Waiting for the rain to fall" },
        ],
        features: {
          tempo: "slow",
          energy: "low",
          genre: ["Ambient", "Cinematic", "Acoustic"],
          mood: ["Sad", "Melancholy", "Reflective", "Night Drive"],
          popularity: {
            plays: 35000, likes: 8900, replays: 1200, completions: 12000, shares: 55,
            recent24h: { plays: 800, likes: 150, replays: 50, comments: 5 },
          },
        },
        uploadedBy: null,
      },
      {
        id: "song-4",
        title: "IRON WILL",
        artist: "PRXJECT",
        coverUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
        audioUrl: "",
        mood: "Gym",
        likes: 67300,
        comments: 2100,
        saves: 12400,
        shares: 8900,
        lyrics: [
          { time: 0, text: "Push it to the absolute limit" },
          { time: 3, text: "No excuses, gotta get in it" },
          { time: 6, text: "Feel the burn, feel the fire" },
          { time: 9, text: "Taking it higher and higher" },
        ],
        features: {
          tempo: "fast",
          energy: "high",
          genre: ["Phonk", "Electronic", "Bass"],
          mood: ["Gym", "Hype", "Aggressive", "Focus"],
          popularity: {
            plays: 250000, likes: 67300, replays: 45000, completions: 190000, shares: 8900,
            recent24h: { plays: 45000, likes: 12000, replays: 8500, comments: 450 },
          },
        },
        uploadedBy: null,
      },
      {
        id: "song-5",
        title: "Electric Horizon",
        artist: "Neon Waves",
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
        audioUrl: "",
        mood: "Hype",
        likes: 23400,
        comments: 560,
        saves: 4200,
        shares: 1900,
        lyrics: [
          { time: 0, text: "The future lights up the sky" },
          { time: 3, text: "Electric dreams never die" },
          { time: 6, text: "Racing past the horizon line" },
          { time: 9, text: "Everything is going to be fine" },
        ],
        features: {
          tempo: "fast",
          energy: "high",
          genre: ["Synthwave", "Electronic", "Dance"],
          mood: ["Hype", "Night Drive", "Nostalgic", "Focus"],
          popularity: {
            plays: 89000, likes: 23400, replays: 12000, completions: 65000, shares: 1900,
            recent24h: { plays: 9000, likes: 2300, replays: 1200, comments: 90 },
          },
        },
        uploadedBy: DEMO_USER_ID,
      },
      {
        id: "song-6",
        title: "Moonlit Reverie",
        artist: "Luna Bloom",
        coverUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=400&fit=crop",
        audioUrl: "",
        mood: "Chill",
        likes: 34100,
        comments: 780,
        saves: 6700,
        shares: 880,
        lyrics: [
          { time: 0, text: "Floating on a silver cloud" },
          { time: 3, text: "Far away from all the crowd" },
          { time: 6, text: "Stars are whispering your name" },
          { time: 9, text: "Everything feels just the same" },
        ],
        features: {
          tempo: "slow",
          energy: "low",
          genre: ["Indie", "Dream Pop", "Ambient"],
          mood: ["Chill", "Relax", "Sad", "Cozy"],
          popularity: {
            plays: 98000, likes: 34100, replays: 18000, completions: 72000, shares: 880,
            recent24h: { plays: 3200, likes: 900, replays: 700, comments: 40 },
          },
        },
        uploadedBy: null,
      },
    ];

    for (const s of songData) {
      await db.insert(songs).values(s as any);
    }
    console.log(`Seeded ${songData.length} songs`);

    // Seed moments
    await db.insert(moments).values([
      {
        id: "moment-1",
        userId: "u-alex",
        songId: "song-3",
        lyricLine: "Shadows dancing on the wall",
        mood: "Sad",
        caption: "Exactly how I feel tonight. This track hits different when it's raining outside. 🌧️",
        likes: 452,
        comments: 24,
      },
      {
        id: "moment-2",
        userId: "u-sarah",
        songId: "song-2",
        lyricLine: "Coffee cold but mind awake",
        mood: "Focus",
        caption: "Grinding through this codebase at 3 AM. ChillHop always pulls me through. ☕💻",
        likes: 1205,
        comments: 89,
      },
      {
        id: "moment-3",
        userId: "u-jake",
        songId: "song-4",
        lyricLine: "No excuses, gotta get in it",
        mood: "Gym",
        caption: "PR day! Let's goooo! 💪🔥",
        likes: 3400,
        comments: 112,
      },
    ]);
    console.log("Seeded moments");
  }

  console.log("Seed complete!");
  await pool.end();
}

seed().catch(console.error);

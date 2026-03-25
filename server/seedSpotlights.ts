/**
 * Seeds the spotlights table with realistic demo data.
 * Run once: npx tsx server/seedSpotlights.ts
 * Called automatically from index.ts when table is empty.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { spotlights } from "@shared/schema";
import { count } from "drizzle-orm";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const DEMO_SPOTLIGHTS = [
  {
    artistName: "Neon Waves",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=neonwaves",
    title: "The Late-Night Studio Sessions",
    description: "How I built my signature synthwave sound in my bedroom at 3am.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=600&fit=crop",
    durationSeconds: 142,
    tags: ["production", "synthwave", "process"],
    prompt: "What does your creative process look like at 3am?",
    views: 8240,
    likes: 1320,
    status: "approved" as const,
  },
  {
    artistName: "Luna Bloom",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=lunabloom",
    title: "Writing Lyrics From Pain",
    description: "I talk about how my hardest year became my best album. Raw and honest.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=600&fit=crop",
    durationSeconds: 198,
    tags: ["songwriting", "vulnerability", "mental health"],
    prompt: "How do you turn real pain into something beautiful?",
    views: 14500,
    likes: 3780,
    status: "approved" as const,
  },
  {
    artistName: "PRXJECT",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=prxject",
    title: "The Phonk Formula: Breaking It Down",
    description: "I deconstruct my biggest track stem by stem — bass, 808s, vocal chops, all of it.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop",
    durationSeconds: 265,
    tags: ["phonk", "production", "breakdown"],
    prompt: "Break down a track you're most proud of — stem by stem.",
    views: 22100,
    likes: 5400,
    status: "approved" as const,
  },
  {
    artistName: "ChillHop Beats",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=chillhop",
    title: "Finding Flow: My Lofi Ritual",
    description: "Morning coffee, rain sounds, and the beat that almost never got finished.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=600&fit=crop",
    durationSeconds: 175,
    tags: ["lofi", "routine", "focus"],
    prompt: "What rituals help you get into a creative flow state?",
    views: 11300,
    likes: 2890,
    status: "approved" as const,
  },
  {
    artistName: "The Rain",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=therain",
    title: "Silence as an Instrument",
    description: "Why I leave space in my compositions — and why most producers are terrified of silence.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=600&h=600&fit=crop",
    durationSeconds: 221,
    tags: ["composition", "ambient", "technique"],
    prompt: "What's the most underrated element in music production?",
    views: 7800,
    likes: 2100,
    status: "approved" as const,
  },
  {
    artistName: "Echo Drift",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=echodrift",
    title: "From Bedroom to 1M Streams",
    description: "My honest story: the rejections, the pivots, and the one upload that changed everything.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=600&fit=crop",
    durationSeconds: 310,
    tags: ["journey", "streaming", "independent"],
    prompt: "What would you tell your younger self before your first upload?",
    views: 31000,
    likes: 7600,
    status: "approved" as const,
  },
  {
    artistName: "Neon Waves",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=neonwaves",
    title: "Gear That Changed My Sound",
    description: "The $40 plugin that made me sound like I had a $10,000 studio.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1519683384663-285a27bd9a31?w=600&h=600&fit=crop",
    durationSeconds: 155,
    tags: ["gear", "plugins", "tips"],
    prompt: "What single piece of gear or software transformed your sound?",
    views: 9400,
    likes: 2200,
    status: "approved" as const,
  },
  {
    artistName: "Luna Bloom",
    artistAvatarUrl: "https://i.pravatar.cc/150?u=lunabloom",
    title: "Collab Chemistry",
    description: "I've worked with 20+ producers. Here's what separates the good collabs from the toxic ones.",
    mediaType: "audio" as const,
    mediaUrl: "",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop",
    durationSeconds: 189,
    tags: ["collaboration", "creative process", "relationships"],
    prompt: "What makes a creative collaboration actually work?",
    views: 12700,
    likes: 3100,
    status: "approved" as const,
  },
];

export async function seedSpotlightsIfEmpty(): Promise<void> {
  try {
    const result = await db.select({ c: count() }).from(spotlights);
    const existing = result[0]?.c ?? 0;
    if (existing > 0) return;

    console.log("[seed] Seeding spotlight interviews…");
    for (const s of DEMO_SPOTLIGHTS) {
      await db.insert(spotlights).values(s);
    }
    console.log(`[seed] Inserted ${DEMO_SPOTLIGHTS.length} spotlight interviews.`);
  } catch (e) {
    console.warn("[seed] Could not seed spotlights:", e);
  } finally {
    await pool.end().catch(() => {});
  }
}

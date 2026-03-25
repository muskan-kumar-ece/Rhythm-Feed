/**
 * Rytham AI Analysis Engine
 *
 * Simulates AI-powered song analysis using metadata signals.
 * In production this would call a real audio ML pipeline.
 * Here we derive realistic features from genre + mood + title + energy hints.
 */

export interface AIAnalysisResult {
  tempo: "slow" | "medium" | "fast";
  energy: "low" | "medium" | "high";
  moodCategories: string[];
  aiTags: string[];
  estimatedBpm: number;
}

// ── Tag vocabulary ────────────────────────────────────────────────────────────

const GENRE_TAGS: Record<string, string[]> = {
  "hip-hop":      ["urban", "rhythmic", "lyrical", "boom-bap", "hard-hitting"],
  "rap":          ["urban", "lyrical", "flow", "street", "expressive"],
  "pop":          ["catchy", "radio-ready", "melodic", "polished", "mainstream"],
  "r&b":          ["soulful", "smooth", "vibe", "groove", "emotional"],
  "electronic":   ["synth-driven", "atmospheric", "textured", "produced", "sonic"],
  "dance":        ["upbeat", "floor-ready", "energetic", "percussive", "rhythmic"],
  "edm":          ["drop-heavy", "build-up", "euphoric", "festival", "synth"],
  "trap":         ["808s", "dark", "urban", "melodic", "punchy"],
  "lo-fi":        ["lo-fi", "nostalgic", "warm", "chill", "textured"],
  "indie":        ["authentic", "indie", "emotional", "layered", "raw"],
  "alternative":  ["alternative", "introspective", "layered", "raw", "expressive"],
  "rock":         ["guitar-driven", "powerful", "raw", "dynamic", "intense"],
  "jazz":         ["improvisational", "smooth", "sophisticated", "complex", "soulful"],
  "classical":    ["orchestral", "dynamic", "textured", "expressive", "timeless"],
  "afrobeats":    ["afro", "percussive", "groove", "infectious", "rhythmic"],
  "latin":        ["latin", "passionate", "percussive", "rhythmic", "vibrant"],
  "soul":         ["soulful", "emotional", "heartfelt", "groove", "rich"],
  "ambient":      ["ambient", "atmospheric", "spatial", "meditative", "immersive"],
  "country":      ["country", "storytelling", "authentic", "roots", "acoustic"],
  "folk":         ["acoustic", "storytelling", "raw", "authentic", "organic"],
};

const MOOD_TAGS: Record<string, string[]> = {
  "chill":        ["chill", "relaxed", "laid-back", "smooth", "easy-listening"],
  "focus":        ["focused", "deep", "minimal", "flow-state", "concentrated"],
  "study":        ["study", "calm", "clear", "meditative", "serene"],
  "gym":          ["pump-up", "motivational", "high-intensity", "driven", "powerful"],
  "night drive":  ["late-night", "cinematic", "atmospheric", "moody", "cruise"],
  "sad":          ["melancholic", "emotional", "reflective", "bittersweet", "heartfelt"],
  "hype":         ["hype", "energetic", "rowdy", "explosive", "anthemic"],
  "romantic":     ["romantic", "sensual", "intimate", "tender", "warm"],
  "party":        ["celebratory", "fun", "social", "upbeat", "infectious"],
  "meditation":   ["meditative", "calming", "spiritual", "serene", "grounding"],
};

const ENERGY_TAGS: Record<string, string[]> = {
  low:    ["ethereal", "understated", "subtle"],
  medium: ["balanced", "dynamic", "groovy"],
  high:   ["explosive", "driven", "intense"],
};

const TEMPO_TAGS: Record<string, string[]> = {
  slow:   ["slow-burn", "deliberate", "languid"],
  medium: ["mid-tempo", "paced", "steady"],
  fast:   ["uptempo", "racing", "frenetic"],
};

// BPM ranges
const BPM_MAP: Record<string, [number, number]> = {
  slow:   [60, 90],
  medium: [90, 120],
  fast:   [120, 180],
};

// ── Mood categories by input mood ─────────────────────────────────────────────

const MOOD_CATEGORY_MAP: Record<string, string[]> = {
  "chill":        ["Chill", "Relax"],
  "focus":        ["Focus", "Study"],
  "study":        ["Study", "Focus"],
  "gym":          ["Gym", "Hype"],
  "night drive":  ["Night Drive", "Chill"],
  "sad":          ["Sad", "Emotional"],
  "hype":         ["Hype", "Gym"],
  "romantic":     ["Romantic", "Chill"],
  "party":        ["Hype", "Party"],
  "meditation":   ["Chill", "Focus"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInRange([min, max]: [number, number]): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

// ── Main analyzer ─────────────────────────────────────────────────────────────

export interface AnalysisInput {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  tempo: "slow" | "medium" | "fast";
  energy: "low" | "medium" | "high";
  fileSizeBytes?: number;
}

export function analyzeTrack(input: AnalysisInput): AIAnalysisResult {
  const genreKey  = input.genre.toLowerCase();
  const moodKey   = input.mood.toLowerCase();
  const tempoKey  = input.tempo;
  const energyKey = input.energy;

  // Pick genre tags
  const genreTagPool = GENRE_TAGS[genreKey] ?? GENRE_TAGS["pop"];
  const genreTags    = genreTagPool.slice(0, 3);

  // Pick mood tags
  const moodTagPool  = MOOD_TAGS[moodKey]  ?? MOOD_TAGS["chill"];
  const moodTags     = moodTagPool.slice(0, 2);

  // Energy / tempo tags
  const energyTags = ENERGY_TAGS[energyKey]?.slice(0, 1) ?? [];
  const tempoTags  = TEMPO_TAGS[tempoKey]?.slice(0, 1) ?? [];

  // Title-based signals (if title contains certain words)
  const titleLower = input.title.toLowerCase();
  const titleTags: string[] = [];
  if (/night|dark|shadow|midnight/.test(titleLower)) titleTags.push("dark", "nocturnal");
  if (/sun|light|bright|day|morning/.test(titleLower)) titleTags.push("uplifting", "radiant");
  if (/love|heart|kiss|miss/.test(titleLower)) titleTags.push("romantic");
  if (/fire|burn|flame|heat/.test(titleLower)) titleTags.push("passionate");
  if (/wave|ocean|sea|water|rain/.test(titleLower)) titleTags.push("fluid", "wave-like");
  if (/run|chase|escape|free/.test(titleLower)) titleTags.push("liberating");

  // Combine and deduplicate, max 8 tags
  const allTags = unique([...genreTags, ...moodTags, ...energyTags, ...tempoTags, ...titleTags]);
  const aiTags  = allTags.slice(0, 8);

  // Mood categories
  const moodCategories = MOOD_CATEGORY_MAP[moodKey] ?? ["Chill"];

  // BPM estimate
  const estimatedBpm = randomInRange(BPM_MAP[tempoKey]);

  return {
    tempo: tempoKey,
    energy: energyKey,
    moodCategories,
    aiTags,
    estimatedBpm,
  };
}

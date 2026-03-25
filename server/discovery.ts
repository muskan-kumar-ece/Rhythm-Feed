/**
 * VibeScroll Discovery Boost System
 *
 * Lifecycle of a new song:
 *
 *   test (score 10)  ──→  growth (score 40)  ──→  broad (score 75)  ──→  full (score 100)
 *         ↓ low engagement
 *   suppressed (score 3)
 *
 * How the gate works
 * ──────────────────
 * A song's distributionScore (0–100) is the percentage chance it is included
 * in any given feed request.  A new song at score 10 will appear in roughly 1
 * in 10 feeds.  Once engagement data confirms it resonates, the score is
 * promoted and the song reaches progressively more users.
 *
 * Evaluation trigger
 * ──────────────────
 * After every behavior log POST for a song that is not yet at "full" phase,
 * evaluateSongDistribution() is called asynchronously.  It reads all behavior
 * logs for that song, computes four engagement metrics, classifies the result,
 * and writes a new distributionScore + distributionPhase back to the DB.
 */

import type { IStorage } from "./storage";
import type { BehaviorLog } from "@shared/schema";

// ─── Phase definitions ────────────────────────────────────────────────────────

export type DistributionPhase =
  | "test"         // Brand-new song, shown to ~10% of feeds
  | "growth"       // Proven early engagement, ~40% of feeds
  | "broad"        // Strong engagement, ~75% of feeds
  | "full"         // Fully distributed, shown to everyone
  | "suppressed";  // Poor engagement, ~3% of feeds (still discoverable, not hidden)

export interface DistributionStatus {
  score: number;                // 0–100
  phase: DistributionPhase;
  metrics: EngagementMetrics | null;  // null if < MIN_LOGS
  lastEvaluatedAt: string;            // ISO timestamp
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** Minimum number of behavior logs before making a distribution decision. */
const MIN_LOGS = 3;

/** Starting score for every newly uploaded song. */
export const NEW_SONG_SCORE = 10;
export const NEW_SONG_PHASE: DistributionPhase = "test";

// ─── Engagement Metrics ───────────────────────────────────────────────────────

export interface EngagementMetrics {
  totalLogs: number;
  /** Fraction of listens that were not skipped (0–1). */
  completionRate: number;
  /** Fraction of listens that were skipped (0–1). */
  skipRate: number;
  /** Average number of replays per listen. */
  avgReplays: number;
  /** Fraction of listens that resulted in a like (0–1). */
  likeRate: number;
  /** Average listen duration in seconds. */
  avgDurationSeconds: number;
}

export function computeMetrics(logs: BehaviorLog[]): EngagementMetrics {
  const total = logs.length;
  if (total === 0) {
    return { totalLogs: 0, completionRate: 0, skipRate: 0, avgReplays: 0, likeRate: 0, avgDurationSeconds: 0 };
  }

  const skippedCount   = logs.filter(l => l.skipped).length;
  const completedCount = total - skippedCount;
  const totalReplays   = logs.reduce((s, l) => s + l.replays, 0);
  const likedCount     = logs.filter(l => l.liked).length;
  const totalDuration  = logs.reduce((s, l) => s + l.durationSeconds, 0);

  return {
    totalLogs:          total,
    completionRate:     completedCount / total,
    skipRate:           skippedCount   / total,
    avgReplays:         totalReplays   / total,
    likeRate:           likedCount     / total,
    avgDurationSeconds: totalDuration  / total,
  };
}

// ─── Engagement Classification ────────────────────────────────────────────────

export type EngagementLevel = "high" | "neutral" | "low";

/**
 * Classify the overall engagement level from metrics.
 *
 * High  → at least one strong positive signal (people finish it, replay, or like)
 * Low   → dominated by skips with no positive signal
 * Neutral → mixed or insufficient signal
 */
export function classifyEngagement(m: EngagementMetrics): EngagementLevel {
  // Strong positive signals
  const strongCompletion = m.completionRate >= 0.55;
  const strongReplays    = m.avgReplays     >= 0.25;
  const strongLikes      = m.likeRate       >= 0.12;
  const goodDuration     = m.avgDurationSeconds >= 20;

  if ((strongCompletion && (strongReplays || strongLikes)) ||
      strongLikes ||
      (strongCompletion && goodDuration)) {
    return "high";
  }

  // Strong negative signals
  const heavySkips       = m.skipRate >= 0.65;
  const noPositive       = m.likeRate === 0 && m.avgReplays === 0;
  const poorCompletion   = m.completionRate < 0.25;

  if (heavySkips && noPositive) return "low";
  if (poorCompletion && heavySkips) return "low";

  return "neutral";
}

// ─── Score Adjustment ─────────────────────────────────────────────────────────

/**
 * Given the current score and engagement level, return the new score + phase.
 *
 * Promotion ladder (high engagement):
 *   test (≤15)  → growth (×4, cap 40)
 *   growth (≤50) → broad  (×2, cap 75)
 *   broad (≤85) → full   (×1.4, cap 100)
 *
 * Suppression (low engagement):
 *   any phase → score × 0.4, floor at 3, phase = suppressed
 *
 * Neutral:
 *   small nudge upward: +5 pts, cap at next phase ceiling
 */
export function adjustDistribution(
  currentScore: number,
  level: EngagementLevel
): { newScore: number; newPhase: DistributionPhase } {
  let newScore = currentScore;

  if (level === "high") {
    if (currentScore <= 15)      newScore = Math.min(currentScore * 4,   40);
    else if (currentScore <= 50) newScore = Math.min(currentScore * 2,   75);
    else if (currentScore <= 85) newScore = Math.min(currentScore * 1.4, 100);
    else                         newScore = 100;
  } else if (level === "low") {
    newScore = Math.max(currentScore * 0.4, 3);
  } else {
    // neutral: gentle nudge
    newScore = Math.min(currentScore + 5, currentScore <= 15 ? 15 : currentScore <= 50 ? 50 : 85);
  }

  return { newScore, newPhase: scoreToPhase(newScore) };
}

export function scoreToPhase(score: number): DistributionPhase {
  if (score >= 99)  return "full";
  if (score >= 70)  return "broad";
  if (score >= 30)  return "growth";
  if (score >= 8)   return "test";
  return "suppressed";
}

// ─── Distribution Gate ────────────────────────────────────────────────────────

/**
 * Probabilistic gate: should this song appear in the current feed request?
 *
 * Songs at full distribution (score ≥ 99) always pass.
 * All other songs pass with probability = score / 100.
 *
 * For small catalogues we guarantee at least `minIncluded` songs pass by
 * falling back to the top-scored ones when random gating would leave too few.
 */
export function applyDistributionGate(
  songs: { id: string; distributionScore: number }[],
  minIncluded = 3
): Set<string> {
  const passed   = new Set<string>();
  const fallback: typeof songs = [];

  for (const song of songs) {
    if (song.distributionScore >= 99 || Math.random() * 100 < song.distributionScore) {
      passed.add(song.id);
    } else {
      fallback.push(song);
    }
  }

  // If too few songs passed, let the highest-scored excluded songs through
  if (passed.size < minIncluded) {
    const sorted = [...fallback].sort((a, b) => b.distributionScore - a.distributionScore);
    for (const song of sorted) {
      if (passed.size >= minIncluded) break;
      passed.add(song.id);
    }
  }

  return passed;
}

// ─── Evaluation Orchestrator ──────────────────────────────────────────────────

/**
 * Called after every new behavior log for a song that hasn't reached "full".
 * Reads all logs for the song, computes metrics, classifies engagement,
 * and updates the song's distributionScore + distributionPhase in the DB.
 *
 * Runs asynchronously (fire-and-forget) so it never blocks the API response.
 */
export async function evaluateSongDistribution(
  songId: string,
  currentScore: number,
  currentPhase: DistributionPhase,
  storage: IStorage
): Promise<void> {
  // Already fully distributed, nothing to do
  if (currentPhase === "full" && currentScore >= 99) return;

  const logs = await storage.getSongBehaviorLogs(songId);

  // Need at least MIN_LOGS before making a decision
  if (logs.length < MIN_LOGS) return;

  const metrics = computeMetrics(logs);
  const level   = classifyEngagement(metrics);
  const { newScore, newPhase } = adjustDistribution(currentScore, level);

  // Only write if something changed (avoid noisy DB writes)
  if (Math.abs(newScore - currentScore) < 0.5 && newPhase === currentPhase) return;

  await storage.updateSongDistribution(songId, newScore, newPhase);

  console.log(
    `[discovery] ${songId} | ${currentPhase}(${currentScore.toFixed(1)}) → ${newPhase}(${newScore.toFixed(1)})` +
    ` | ${level} engagement | comp=${(metrics.completionRate * 100).toFixed(0)}%` +
    ` skip=${(metrics.skipRate * 100).toFixed(0)}%` +
    ` likes=${(metrics.likeRate * 100).toFixed(0)}%` +
    ` replays=${metrics.avgReplays.toFixed(2)}`
  );
}

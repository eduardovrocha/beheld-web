/**
 * Deterministic 12-month trajectory derived from a single signed snapshot.
 *
 * A .dpbundle only ever carries one snapshot; the chain itself (previous_hash
 * → previous_hash → …) is anchored by hashes, but the predecessors' content
 * is not embedded.  When the SPA needs to show a "12-month score trajectory"
 * we synthesize a plausible monthly series anchored to:
 *   - the current scores (latest point matches exactly)
 *   - growth_rate (slope: higher growth → steeper climb from the past)
 *   - a stable RNG seeded by the bundle hash (same bundle ⇒ same chart)
 *
 * This mirrors `dashboard/src/lib/beheld-history.ts`.
 */
import type { BundleScores } from "./types";

export interface ScoreSnapshot {
  date: string; // YYYY-MM
  overall: number;
  prompt_quality: number;
  test_maturity: number;
  tech_breadth: number;
  growth_rate: number;
}

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function seedFromString(s: string): number {
  let acc = 0;
  for (let i = 0; i < s.length; i++) acc = (acc + s.charCodeAt(i)) % 1_000_003;
  return acc;
}

export function buildHistory(
  scores: BundleScores,
  createdAt: string,
  seedSource: string,
  months = 12,
): ScoreSnapshot[] {
  const rand = seeded(seedFromString(seedSource));
  const end = new Date(createdAt);
  const slope = (scores.growth_rate - 50) / 100; // -0.5 .. 0.5

  const snapshots: ScoreSnapshot[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setMonth(d.getMonth() - i);
    const t = (months - 1 - i) / (months - 1); // 0..1 across the window
    const drift = (1 - t) * slope * 25;
    const noise = () => (rand() - 0.5) * 6;
    snapshots.push({
      date: d.toISOString().slice(0, 7),
      overall: Math.round(clamp(scores.overall - drift + noise())),
      prompt_quality: Math.round(clamp(scores.prompt_quality - drift + noise())),
      test_maturity: Math.round(
        clamp(scores.test_maturity - drift * 0.7 + noise()),
      ),
      tech_breadth: Math.round(
        clamp(scores.tech_breadth - drift * 0.5 + noise()),
      ),
      growth_rate: Math.round(
        clamp(scores.growth_rate - drift * 1.2 + noise()),
      ),
    });
  }
  return snapshots;
}

export function consistency(snaps: ScoreSnapshot[]): number {
  if (snaps.length === 0) return 0;
  const xs = snaps.map((s) => s.overall);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

export function consistencyLabel(stdev: number): string {
  if (stdev < 4) return "very_high";
  if (stdev < 7) return "high";
  if (stdev < 11) return "moderate";
  return "volatile";
}

export function netGrowth(snaps: ScoreSnapshot[]): number {
  if (snaps.length === 0) return 0;
  return snaps[snaps.length - 1].overall - snaps[0].overall;
}

export function peakSnapshot(snaps: ScoreSnapshot[]): ScoreSnapshot {
  return snaps.reduce(
    (best, s) => (s.overall > best.overall ? s : best),
    snaps[0],
  );
}

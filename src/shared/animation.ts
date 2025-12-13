export type AttentionPattern = number[];
export type MouthState = 'open' | 'closed';

export const DEFAULT_ATTENTION_PATTERNS: AttentionPattern[] = [
  [120, 90, 120, 240, 120],
  [160, 140, 80, 180],
  [90, 90, 120, 90, 260],
  [200, 80, 80, 220, 140],
  [140, 140, 140, 160],
  [180, 120, 200],
];

/**
 * Build cumulative pulse timestamps from a pattern with optional jitter.
 */
export function buildPulseSchedule(
  pattern: AttentionPattern,
  jitterMs = 0,
): number[] {
  let elapsed = 0;
  return pattern.map((duration) => {
    const jitter =
      jitterMs > 0
        ? (Math.random() * jitterMs * 2 - jitterMs)
        : 0;
    elapsed += Math.max(40, duration + Math.round(jitter));
    return elapsed;
  });
}

export type MouthThresholds = {
  open: number;
  close: number;
};

/**
 * Simple hysteresis-based mouth state driver from normalized energy.
 */
export function nextMouthState(
  energy: number,
  prev: MouthState,
  thresholds: MouthThresholds = { open: 0.25, close: 0.18 },
): MouthState {
  const clamped = Math.max(0, Math.min(1, energy));
  if (prev === 'open' && clamped < thresholds.close) return 'closed';
  if (prev === 'closed' && clamped > thresholds.open) return 'open';
  return prev;
}

/**
 * Exponential smoothing helper to tame noisy amplitude readings.
 */
export function smoothEnergy(prev: number, current: number, factor = 0.6): number {
  const alpha = Math.max(0, Math.min(1, factor));
  return alpha * current + (1 - alpha) * prev;
}

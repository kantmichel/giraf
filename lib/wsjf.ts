import type { NormalizedIssue } from "@/types/github";

const PRIORITY_VALUE: Record<NonNullable<NormalizedIssue["priority"]>, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const EFFORT_COST: Record<NonNullable<NormalizedIssue["effort"]>, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * WSJF (Weighted Shortest Job First) score: priority value ÷ effort cost.
 * Returns null when either priority or effort is unset.
 *
 * Score range: 0.33 (low priority + high effort) to 4.00 (critical + low effort).
 */
export function computeWsjf(
  priority: NormalizedIssue["priority"],
  effort: NormalizedIssue["effort"],
): number | null {
  if (!priority || !effort) return null;
  return PRIORITY_VALUE[priority] / EFFORT_COST[effort];
}

/** Format a WSJF score for display, e.g. 1.5 → "1.5", null → "—". */
export function formatWsjf(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(score % 1 === 0 ? 1 : 2);
}

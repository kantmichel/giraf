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

/** Multiplier applied per `impact: <type>` label. Stacks multiplicatively. */
export const IMPACT_BOOST_PER_LABEL = 1.5;
/** Cap on total boost so many impact labels can't push something past critical work. */
export const IMPACT_BOOST_CAP = 3;

/**
 * Multiplier applied to base WSJF score for a list of impacts.
 * 0 impacts → 1.0, 1 → 1.5, 2 → 2.25, capped at IMPACT_BOOST_CAP (3.0).
 */
export function computeImpactMultiplier(impacts: string[]): number {
  if (!impacts || impacts.length === 0) return 1;
  const raw = Math.pow(IMPACT_BOOST_PER_LABEL, impacts.length);
  return Math.min(raw, IMPACT_BOOST_CAP);
}

/**
 * WSJF (Weighted Shortest Job First) score: (priority ÷ effort) × impact multiplier.
 * Returns null when either priority or effort is unset.
 *
 * Base range: 0.33 (low priority + high effort) to 4.00 (critical + low effort).
 * With impacts, score is multiplied by 1.5^N (capped at 3×).
 */
export function computeWsjf(
  priority: NormalizedIssue["priority"],
  effort: NormalizedIssue["effort"],
  impacts: string[] = [],
): number | null {
  if (!priority || !effort) return null;
  const base = PRIORITY_VALUE[priority] / EFFORT_COST[effort];
  return base * computeImpactMultiplier(impacts);
}

/** Format a WSJF score for display, e.g. 1.5 → "1.5", null → "—". */
export function formatWsjf(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(score % 1 === 0 ? 1 : 2);
}

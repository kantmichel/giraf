import type { NormalizedIssue } from "@/types/github";

/**
 * The one place a GitHub label becomes an issue field. The server's normaliser,
 * the optimistic cache update and the detail drawer all read labels through
 * here — when the optimistic update kept its own copy, it skipped the
 * lowercasing, turned `effort: Low` into "Low" and scored every moved card NaN.
 *
 * Matching is case-insensitive, since labels are often created by hand. A
 * value outside the known set reads as unset rather than being passed through,
 * so a stray `status: whatever` can never pose as a status.
 */

export const STATUS_PREFIX = "status: ";
export const PRIORITY_PREFIX = "priority: ";
export const EFFORT_PREFIX = "effort: ";
export const IMPACT_PREFIX = "impact: ";
export const DUE_PREFIX = "due: ";

type Status = NonNullable<NormalizedIssue["status"]>;
type Priority = NonNullable<NormalizedIssue["priority"]>;
type Effort = NonNullable<NormalizedIssue["effort"]>;

const STATUSES: readonly Status[] = ["to do", "doing", "in review", "done"];
const PRIORITIES: readonly Priority[] = ["critical", "high", "medium", "low"];
const EFFORTS: readonly Effort[] = ["low", "medium", "high"];

/** Lowercased value of the first label with this prefix, or null. */
function valueOf(names: string[], prefix: string): string | null {
  const name = names.find((n) => n.toLowerCase().startsWith(prefix));
  return name ? name.toLowerCase().slice(prefix.length).trim() : null;
}

function known<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.find((a) => a === value) ?? null;
}

export function labelStatus(names: string[]): Status | null {
  return known(valueOf(names, STATUS_PREFIX), STATUSES);
}

export function labelPriority(names: string[]): Priority | null {
  return known(valueOf(names, PRIORITY_PREFIX), PRIORITIES);
}

export function labelEffort(names: string[]): Effort | null {
  return known(valueOf(names, EFFORT_PREFIX), EFFORTS);
}

export function labelImpacts(names: string[]): string[] {
  return names
    .filter((n) => n.toLowerCase().startsWith(IMPACT_PREFIX))
    .map((n) => n.toLowerCase().slice(IMPACT_PREFIX.length));
}

/**
 * Due date from a `due: YYYY-MM-DD` label. Anything that isn't a real calendar
 * date is ignored rather than guessed at, so a typo shows as "no due date"
 * instead of silently scheduling work on the wrong day.
 */
export function labelDueDate(names: string[]): string | null {
  const raw = valueOf(names, DUE_PREFIX);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (isNaN(parsed.getTime())) return null;
  // Rejects things like 2026-02-31, which Date would roll forward.
  return parsed.toISOString().slice(0, 10) === raw ? raw : null;
}

/** Every issue field that is derived from its labels. */
export function labelFields(
  names: string[]
): Pick<NormalizedIssue, "status" | "priority" | "effort" | "impacts" | "dueDate"> {
  return {
    status: labelStatus(names),
    priority: labelPriority(names),
    effort: labelEffort(names),
    impacts: labelImpacts(names),
    dueDate: labelDueDate(names),
  };
}

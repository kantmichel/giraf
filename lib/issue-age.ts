import { differenceInDays, parseISO } from "date-fns";

/**
 * Buckets for the "Age" filter, measured from the issue's creation date.
 * Ranges are half-open ([minDays, maxDays)) so the buckets never overlap —
 * selecting several in the multi-select is a plain union.
 */
export const AGE_BUCKETS = [
  { value: "1d", label: "< 1 day", minDays: 0, maxDays: 1 },
  { value: "1-7d", label: "1–7 days", minDays: 1, maxDays: 7 },
  { value: "7-30d", label: "7–30 days", minDays: 7, maxDays: 30 },
  { value: "30-90d", label: "30–90 days", minDays: 30, maxDays: 90 },
  { value: "90d", label: "> 90 days", minDays: 90, maxDays: null },
] as const satisfies readonly {
  value: string;
  label: string;
  minDays: number;
  maxDays: number | null;
}[];

export const AGE_FILTER_OPTIONS = AGE_BUCKETS.map((b) => ({
  value: b.value,
  label: b.label,
}));

/** Whole days between now and when the issue was created. */
export function ageInDays(createdAt: string, now: Date = new Date()): number {
  return Math.max(0, differenceInDays(now, parseISO(createdAt)));
}

/** True when the issue falls into any of the selected buckets (empty = no filter). */
export function matchesAgeBuckets(
  createdAt: string,
  selected: string[],
  now: Date = new Date()
): boolean {
  if (selected.length === 0) return true;
  const age = ageInDays(createdAt, now);
  return selected.some((value) => {
    const bucket = AGE_BUCKETS.find((b) => b.value === value);
    if (!bucket) return false;
    return age >= bucket.minDays && (bucket.maxDays === null || age < bucket.maxDays);
  });
}

/** Compact label for the age badge: 4d, 3w, 5mo, 2y. */
export function formatAge(days: number): string {
  if (days < 7) return `${days}d`;
  if (days < 56) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

import {
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subHours,
  subMonths,
} from "date-fns";

export type DateRangePreset =
  | "today"
  | "last-24h"
  | "this-week"
  | "this-month"
  | "last-month"
  | "this-year"
  | "all-time"
  | "last-30-days"
  | "last-90-days"
  | "last-365-days"
  | "since-repo-creation";

export interface DateRange {
  preset: DateRangePreset;
  /** Inclusive lower bound; null means unbounded. */
  from: Date | null;
  /** Inclusive upper bound; null means "now" / unbounded. */
  to: Date | null;
  /** Title-case label for buttons and headers (e.g. "This month"). */
  label: string;
  /** Lowercase label for in-sentence use (e.g. "this month"). */
  shortLabel: string;
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  "today",
  "last-24h",
  "this-week",
  "this-month",
  "last-month",
  "this-year",
  "all-time",
];

export function computeDateRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case "today": {
      return {
        preset,
        from: startOfDay(now),
        to: null,
        label: "Today",
        shortLabel: "today",
      };
    }
    case "last-24h": {
      return {
        preset,
        from: subHours(now, 24),
        to: null,
        label: "Last 24h",
        shortLabel: "last 24h",
      };
    }
    case "this-week": {
      return {
        preset,
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: null,
        label: "This week",
        shortLabel: "this week",
      };
    }
    case "this-month": {
      return {
        preset,
        from: startOfMonth(now),
        to: null,
        label: "This month",
        shortLabel: "this month",
      };
    }
    case "last-month": {
      const lastMonth = subMonths(now, 1);
      return {
        preset,
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        label: "Last month",
        shortLabel: "last month",
      };
    }
    case "this-year": {
      return {
        preset,
        from: startOfYear(now),
        to: null,
        label: "This year",
        shortLabel: "this year",
      };
    }
    case "last-30-days": {
      return {
        preset,
        from: subDays(now, 30),
        to: null,
        label: "Last 30 days",
        shortLabel: "last 30 days",
      };
    }
    case "last-90-days": {
      return {
        preset,
        from: subDays(now, 90),
        to: null,
        label: "Last 90 days",
        shortLabel: "last 90 days",
      };
    }
    case "last-365-days": {
      return {
        preset,
        from: subDays(now, 365),
        to: null,
        label: "Last year",
        shortLabel: "last year",
      };
    }
    case "since-repo-creation": {
      // Without a repo creation date this preset is equivalent to all-time.
      // Callers with a repo context should use computeDateRangeForRepo.
      return {
        preset,
        from: null,
        to: null,
        label: "Since repo creation",
        shortLabel: "since repo creation",
      };
    }
    case "all-time":
    default: {
      return {
        preset: "all-time",
        from: null,
        to: null,
        label: "All time",
        shortLabel: "all time",
      };
    }
  }
}

/**
 * Like `computeDateRange` but resolves `since-repo-creation` against an actual
 * repo creation timestamp. Other presets delegate unchanged.
 */
export function computeDateRangeForRepo(
  preset: DateRangePreset,
  repoCreatedAt: Date | string | null
): DateRange {
  if (preset !== "since-repo-creation") return computeDateRange(preset);
  if (!repoCreatedAt) return computeDateRange("all-time");
  const from =
    typeof repoCreatedAt === "string" ? new Date(repoCreatedAt) : repoCreatedAt;
  return {
    preset,
    from,
    to: null,
    label: "Since repo creation",
    shortLabel: "since repo creation",
  };
}

/**
 * Whether an ISO timestamp falls within a given range.
 * Null bounds are treated as unbounded on that side.
 */
export function withinRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  if (range.from && t < range.from.getTime()) return false;
  if (range.to && t > range.to.getTime()) return false;
  return true;
}

/**
 * Approximate duration in ms of a range, used for "avg cycle" scaling.
 * Returns null for unbounded ranges (all-time).
 */
export function rangeDurationMs(range: DateRange): number | null {
  if (!range.from) return null;
  const to = range.to ?? new Date();
  return to.getTime() - range.from.getTime();
}

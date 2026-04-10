import {
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
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
  | "all-time";

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

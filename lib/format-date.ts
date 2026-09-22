/**
 * Date formatting for the UI. European throughout: day before month, 24-hour
 * clock, never the American month-first ordering.
 *
 * Two families, because the inputs are different kinds of thing:
 *
 * - `formatDay*` take a date-only string (`2026-10-09`, e.g. a `due:` label).
 *   These are pinned to UTC — a calendar date has no timezone, and rendering it
 *   locally shifts it a day west of Greenwich.
 * - `formatInstant*` take a timestamp (`createdAt`, `closedAt`). These are real
 *   moments, so they render in the viewer's local zone.
 */

// Day-first ordering with English month names, and a 24-hour clock.
const LOCALE = "en-GB";

function asUtcDate(dayIso: string): Date | null {
  const d = new Date(`${dayIso}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** `2026-10-09` → "9 Oct" */
export function formatDayShort(dayIso: string): string {
  const d = asUtcDate(dayIso);
  if (!d) return dayIso;
  return d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** `2026-10-09` → "9 Oct 2026" */
export function formatDay(dayIso: string): string {
  const d = asUtcDate(dayIso);
  if (!d) return dayIso;
  return d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** `2026-10-09` → "09/10", for tight columns where the year is noise. */
export function formatDayNumeric(dayIso: string): string {
  const d = asUtcDate(dayIso);
  if (!d) return dayIso;
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

/** Timestamp → "9 Oct 2026", in the viewer's zone. */
export function formatInstant(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Timestamp → "9 Oct 2026 at 15:04", in the viewer's zone. */
export function formatInstantWithTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = formatInstant(iso);
  const time = d.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${day} at ${time}`;
}

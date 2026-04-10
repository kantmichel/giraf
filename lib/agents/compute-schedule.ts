import { CronExpressionParser } from "cron-parser";

/**
 * Given one or more cron expressions, return the nearest upcoming run time (UTC).
 * Returns null if no crons are provided or all fail to parse.
 */
export function computeNextRun(
  crons: string[],
  from: Date = new Date()
): Date | null {
  if (!crons.length) return null;
  const nextDates: Date[] = [];
  for (const cron of crons) {
    try {
      const iter = CronExpressionParser.parse(cron, {
        currentDate: from,
        tz: "UTC",
      });
      nextDates.push(iter.next().toDate());
    } catch {
      // skip invalid crons
    }
  }
  if (!nextDates.length) return null;
  return new Date(Math.min(...nextDates.map((d) => d.getTime())));
}

/**
 * Humanise a cron expression for display. Falls back to the raw string.
 */
export function humanizeCron(cron: string): string {
  const trimmed = cron.trim();
  if (trimmed === "* * * * *") return "Every minute";
  if (trimmed === "0 * * * *") return "Hourly";
  if (/^\*\/\d+ \* \* \* \*$/.test(trimmed)) {
    const n = parseInt(trimmed.split(" ")[0].replace("*/", ""), 10);
    return `Every ${n} minutes`;
  }
  if (/^0 \*\/\d+ \* \* \*$/.test(trimmed)) {
    const n = parseInt(trimmed.split(" ")[1].replace("*/", ""), 10);
    return `Every ${n}h`;
  }
  const dailyMatch = trimmed.match(/^(\d+) (\d+) \* \* \*$/);
  if (dailyMatch) {
    const [, minute, hour] = dailyMatch;
    return `Daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")} UTC`;
  }
  const weeklyMatch = trimmed.match(/^(\d+) (\d+) \* \* ([0-6])$/);
  if (weeklyMatch) {
    const [, minute, hour, dow] = weeklyMatch;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `Weekly on ${days[parseInt(dow, 10)]} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")} UTC`;
  }
  return trimmed;
}

import {
  differenceInDays,
  differenceInCalendarDays,
  format,
  subDays,
  eachDayOfInterval,
  startOfDay,
  startOfWeek,
  isBefore,
  parseISO,
} from "date-fns";
import type { NormalizedIssue } from "@/types/github";

// --- Current metrics (from already-loaded issues) ---

export function computeStatusDistribution(
  issues: NormalizedIssue[]
): Record<string, number> {
  const result: Record<string, number> = {
    "to do": 0,
    doing: 0,
    "in review": 0,
    done: 0,
    unset: 0,
  };
  for (const issue of issues) {
    const key = issue.status ?? "unset";
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export function computePriorityBreakdown(
  issues: NormalizedIssue[]
): Record<string, number> {
  const result: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unset: 0,
  };
  for (const issue of issues) {
    const key = issue.priority ?? "unset";
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export function computeAssigneeWorkload(
  issues: NormalizedIssue[]
): { login: string; avatarUrl: string; count: number }[] {
  const map = new Map<string, { avatarUrl: string; count: number }>();
  for (const issue of issues) {
    for (const assignee of issue.assignees) {
      const existing = map.get(assignee.login);
      if (existing) {
        existing.count++;
      } else {
        map.set(assignee.login, { avatarUrl: assignee.avatarUrl, count: 1 });
      }
    }
  }
  return Array.from(map.entries())
    .map(([login, data]) => ({ login, ...data }))
    .sort((a, b) => b.count - a.count);
}

export function computeUntriagedCount(issues: NormalizedIssue[]): {
  total: number;
  noStatus: number;
  noPriority: number;
} {
  let noStatus = 0;
  let noPriority = 0;
  let total = 0;
  for (const issue of issues) {
    const missing = !issue.status || !issue.priority;
    if (missing) total++;
    if (!issue.status) noStatus++;
    if (!issue.priority) noPriority++;
  }
  return { total, noStatus, noPriority };
}

export function computeEffortSplit(
  issues: NormalizedIssue[]
): Record<string, number> {
  const result: Record<string, number> = { low: 0, medium: 0, high: 0, unset: 0 };
  for (const issue of issues) {
    const key = issue.effort ?? "unset";
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

export function computeIssuesPerRepo(
  issues: NormalizedIssue[]
): { repo: string; count: number }[] {
  const map = new Map<string, number>();
  for (const issue of issues) {
    const key = issue.repo.name;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([repo, count]) => ({ repo, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeAvgIssueAge(issues: NormalizedIssue[]): number {
  const now = new Date();
  const openIssues = issues.filter((i) => i.state === "open");
  if (openIssues.length === 0) return 0;
  const totalDays = openIssues.reduce(
    (sum, i) => sum + differenceInDays(now, parseISO(i.createdAt)),
    0
  );
  return Math.round(totalDays / openIssues.length);
}

export function computeOldestOpenIssue(
  issues: NormalizedIssue[]
): { issue: NormalizedIssue; ageDays: number } | null {
  const openIssues = issues.filter((i) => i.state === "open");
  if (openIssues.length === 0) return null;
  const now = new Date();
  let oldest = openIssues[0];
  let maxAge = differenceInDays(now, parseISO(oldest.createdAt));
  for (const issue of openIssues) {
    const age = differenceInDays(now, parseISO(issue.createdAt));
    if (age > maxAge) {
      oldest = issue;
      maxAge = age;
    }
  }
  return { issue: oldest, ageDays: maxAge };
}

export function computeOnFireCount(issues: NormalizedIssue[]): {
  count: number;
  issues: NormalizedIssue[];
} {
  const now = new Date();
  const onFire = issues.filter((i) => {
    if (i.state !== "open") return false;
    if (i.priority !== "critical" && i.priority !== "high") return false;
    return differenceInDays(now, parseISO(i.createdAt)) > 7;
  });
  return { count: onFire.length, issues: onFire };
}

export function computeFilterSummary(
  issues: NormalizedIssue[],
  allIssues: NormalizedIssue[]
): string {
  const total = issues.length;
  const statuses = computeStatusDistribution(issues);
  const parts: string[] = [`${total} issue${total !== 1 ? "s" : ""}`];

  const doing = statuses["doing"] ?? 0;
  const review = statuses["in review"] ?? 0;
  if (doing > 0) parts.push(`${doing} in progress`);
  if (review > 0) parts.push(`${review} in review`);

  if (issues.length < allIssues.length) {
    parts.push(`filtered from ${allIssues.length} total`);
  }

  return parts.join(" · ");
}

// --- Historical metrics (from closed issues, last 30 days) ---

export function computeClosedOverTime(
  closedIssues: NormalizedIssue[]
): { date: string; count: number }[] {
  const now = new Date();
  const start = subDays(now, 29);
  const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(now) });
  const countMap = new Map<string, number>();
  for (const day of days) {
    countMap.set(format(day, "yyyy-MM-dd"), 0);
  }
  for (const issue of closedIssues) {
    if (!issue.closedAt) continue;
    const key = format(parseISO(issue.closedAt), "yyyy-MM-dd");
    if (countMap.has(key)) {
      countMap.set(key, countMap.get(key)! + 1);
    }
  }
  return Array.from(countMap.entries()).map(([date, count]) => ({ date, count }));
}

export function computeCreatedVsClosed(
  allIssues: NormalizedIssue[],
  closedIssues: NormalizedIssue[]
): { date: string; created: number; closed: number }[] {
  const now = new Date();
  const start = subDays(now, 29);
  const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(now) });

  const createdMap = new Map<string, number>();
  const closedMap = new Map<string, number>();
  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    createdMap.set(key, 0);
    closedMap.set(key, 0);
  }

  for (const issue of allIssues) {
    const key = format(parseISO(issue.createdAt), "yyyy-MM-dd");
    if (createdMap.has(key)) {
      createdMap.set(key, createdMap.get(key)! + 1);
    }
  }

  for (const issue of closedIssues) {
    if (!issue.closedAt) continue;
    const key = format(parseISO(issue.closedAt), "yyyy-MM-dd");
    if (closedMap.has(key)) {
      closedMap.set(key, closedMap.get(key)! + 1);
    }
  }

  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return { date: key, created: createdMap.get(key)!, closed: closedMap.get(key)! };
  });
}

export function computeAvgResolutionTime(
  closedIssues: NormalizedIssue[]
): number {
  const withClosed = closedIssues.filter((i) => i.closedAt);
  if (withClosed.length === 0) return 0;
  const totalDays = withClosed.reduce(
    (sum, i) =>
      sum + differenceInCalendarDays(parseISO(i.closedAt!), parseISO(i.createdAt)),
    0
  );
  return Math.round((totalDays / withClosed.length) * 10) / 10;
}

export function computeClosedThisVsLastWeek(
  closedIssues: NormalizedIssue[]
): { thisWeek: number; lastWeek: number; changePercent: number | null } {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subDays(thisWeekStart, 7);

  let thisWeek = 0;
  let lastWeek = 0;
  for (const issue of closedIssues) {
    if (!issue.closedAt) continue;
    const closed = parseISO(issue.closedAt);
    if (!isBefore(closed, thisWeekStart)) {
      thisWeek++;
    } else if (!isBefore(closed, lastWeekStart)) {
      lastWeek++;
    }
  }

  const changePercent =
    lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

  return { thisWeek, lastWeek, changePercent };
}

export function computeClosedByPerson(
  closedIssues: NormalizedIssue[]
): { login: string; count: number }[] {
  const map = new Map<string, number>();
  for (const issue of closedIssues) {
    for (const assignee of issue.assignees) {
      map.set(assignee.login, (map.get(assignee.login) ?? 0) + 1);
    }
    // If no assignees, count the creator
    if (issue.assignees.length === 0 && issue.createdBy) {
      map.set(issue.createdBy.login, (map.get(issue.createdBy.login) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([login, count]) => ({ login, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeResolutionTimeDistribution(
  closedIssues: NormalizedIssue[]
): { bucket: string; count: number }[] {
  const buckets = [
    { label: "<1d", max: 1 },
    { label: "1-3d", max: 3 },
    { label: "3-7d", max: 7 },
    { label: "1-2w", max: 14 },
    { label: "2-4w", max: 28 },
    { label: ">4w", max: Infinity },
  ];
  const counts = buckets.map(() => 0);

  for (const issue of closedIssues) {
    if (!issue.closedAt) continue;
    const days = differenceInCalendarDays(
      parseISO(issue.closedAt),
      parseISO(issue.createdAt)
    );
    for (let i = 0; i < buckets.length; i++) {
      if (days < buckets[i].max) {
        counts[i]++;
        break;
      }
    }
  }

  return buckets.map((b, i) => ({ bucket: b.label, count: counts[i] }));
}

export function computeDailyStreak(closedIssues: NormalizedIssue[]): number {
  const closedDates = new Set<string>();
  for (const issue of closedIssues) {
    if (!issue.closedAt) continue;
    closedDates.add(format(parseISO(issue.closedAt), "yyyy-MM-dd"));
  }

  let streak = 0;
  let current = startOfDay(new Date());

  // Check if today has closures; if not, start from yesterday
  if (!closedDates.has(format(current, "yyyy-MM-dd"))) {
    current = subDays(current, 1);
  }

  while (closedDates.has(format(current, "yyyy-MM-dd"))) {
    streak++;
    current = subDays(current, 1);
  }

  return streak;
}

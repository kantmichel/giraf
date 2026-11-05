"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { attachEffectiveWsjf } from "@/lib/wsjf";
import { filterIssues, facetCounts, type FilterContext } from "@/lib/issue-filters";
import type { IssueSortDir } from "@/hooks/use-filter-state";
import type { NormalizedIssue, FilterConfig } from "@/types/github";

interface IssuesResponse {
  issues: NormalizedIssue[];
  errors: { repo: string; error: string }[];
  totalRepos: number;
  fetchedRepos: number;
}

interface UseIssuesOptions {
  pollIntervalMs?: number;
  /**
   * Override the `since` date when fetching closed issues. Used by the
   * agents dashboard to pull a much wider history than the default
   * 3-week window. Enables aggressive caching since historical data
   * rarely changes.
   */
  closedSince?: Date;
  /**
   * Date ordering of the returned list: "newest" (default) puts the most
   * recent first. Applies to closedAt on the closed view, createdAt otherwise.
   */
  sortDir?: IssueSortDir;
  /** Leave the query idle, e.g. for data only a filter that is off needs. */
  enabled?: boolean;
  /**
   * The issue keys in this month's plans (useMonthWork). With the
   * `thisMonth` filter on, only these are kept; while they load (null), the
   * filter waits and nothing is narrowed.
   */
  monthWork?: Set<string> | null;
  /** Also count every dropdown's options under the other filters (facetCounts). */
  facets?: boolean;
}

export function useIssues(
  filters: FilterConfig,
  weekOffset = 0,
  options: UseIssuesOptions = {}
) {
  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(
    () => endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );

  const closedSinceIso = options.closedSince?.toISOString();
  const sortDir = options.sortDir ?? "newest";
  const monthWork = options.monthWork ?? null;

  const query = useQuery<IssuesResponse>({
    queryKey: [
      "issues",
      {
        state: filters.state,
        weekOffset:
          filters.state === "closed" && !closedSinceIso ? weekOffset : undefined,
        closedSince: closedSinceIso,
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.state) params.set("state", filters.state);
      if (filters.state === "closed") {
        const sinceDate =
          options.closedSince ?? subWeeks(weekStart, 2);
        params.set("since", sinceDate.toISOString());
      }
      const res = await fetch(`/api/issues?${params}`);
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    // Historical closed issues are served from a persistent SQLite cache
    // on the server side, so refetching is cheap — keep the standard 1 min
    // stale window and let the hook refresh as normal to pick up the
    // current month's updates.
    staleTime: 60_000,
    refetchInterval: options.pollIntervalMs,
    enabled: options.enabled ?? true,
  });

  // Scored over the whole loaded set, before any filtering, so a blocker still
  // outranks what it blocks even when the dependent row is filtered out.
  const scoredIssues = useMemo(
    () => attachEffectiveWsjf(query.data?.issues ?? []),
    [query.data?.issues]
  );

  // When viewing closed issues on the weekly /issues page, narrow to the
  // selected week. When a caller overrides via `closedSince`, skip this week
  // filter so the full historical window is available.
  const filterCtx: FilterContext = useMemo(
    () => ({
      closedWeek: filters.state === "closed" && !closedSinceIso ? { start: weekStart, end: weekEnd } : null,
      monthWork,
    }),
    [filters.state, closedSinceIso, weekStart, weekEnd, monthWork]
  );

  const filteredIssues = useMemo(() => {
    if (!query.data?.issues) return [];
    let issues = filterIssues(scoredIssues, filters, filterCtx);

    // Sort closed issues by closedAt, open issues by createdAt — newest first
    // unless the caller asked for the oldest (most stale) first.
    const dir = sortDir === "oldest" ? 1 : -1;
    if (filters.state === "closed") {
      issues = [...issues].sort(
        (a, b) =>
          (new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime()) * dir
      );
    } else {
      issues = [...issues].sort(
        (a, b) =>
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      );
    }

    return issues;
  }, [query.data?.issues, scoredIssues, filters, filterCtx, sortDir]);

  // Only for a caller with a filter bar: the counts behind its dropdowns.
  const facets = useMemo(
    () => (options.facets && query.data?.issues ? facetCounts(scoredIssues, filters, filterCtx) : null),
    [options.facets, query.data?.issues, scoredIssues, filters, filterCtx]
  );

  return {
    ...query,
    issues: filteredIssues,
    allIssues: scoredIssues,
    facets,
    errors: query.data?.errors ?? [],
    totalRepos: query.data?.totalRepos ?? 0,
    fetchedRepos: query.data?.fetchedRepos ?? 0,
  };
}

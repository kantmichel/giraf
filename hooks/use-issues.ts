"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import { UNSET_FILTER_VALUE } from "@/lib/constants";
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
    // Historical data rarely changes — cache for 5 min when a wide window
    // is requested, otherwise use the default 1 min staleness.
    staleTime: closedSinceIso ? 5 * 60_000 : 60_000,
    refetchInterval: options.pollIntervalMs,
  });

  const filteredIssues = useMemo(() => {
    if (!query.data?.issues) return [];
    let issues = query.data.issues;

    // When viewing closed issues on the weekly /issues page, narrow to the
    // selected week. When a caller overrides via `closedSince`, skip this
    // week filter so the full historical window is available.
    if (filters.state === "closed" && !closedSinceIso) {
      issues = issues.filter((i) => {
        if (!i.closedAt) return false;
        const closedDate = new Date(i.closedAt);
        return closedDate >= weekStart && closedDate <= weekEnd;
      });
    }

    if (filters.repos.length > 0) {
      issues = issues.filter((i) => filters.repos.includes(i.repo.fullName));
    }
    if (filters.status.length > 0) {
      const includeUnset = filters.status.includes(UNSET_FILTER_VALUE);
      const values = filters.status.filter((v) => v !== UNSET_FILTER_VALUE);
      issues = issues.filter((i) =>
        (includeUnset && !i.status) || (i.status && values.includes(i.status))
      );
    }
    if (filters.priority.length > 0) {
      const includeUnset = filters.priority.includes(UNSET_FILTER_VALUE);
      const values = filters.priority.filter((v) => v !== UNSET_FILTER_VALUE);
      issues = issues.filter((i) =>
        (includeUnset && !i.priority) || (i.priority && values.includes(i.priority))
      );
    }
    if (filters.effort.length > 0) {
      const includeUnset = filters.effort.includes(UNSET_FILTER_VALUE);
      const values = filters.effort.filter((v) => v !== UNSET_FILTER_VALUE);
      issues = issues.filter((i) =>
        (includeUnset && !i.effort) || (i.effort && values.includes(i.effort))
      );
    }
    if (filters.assignees.length > 0) {
      issues = issues.filter((i) =>
        i.assignees.some((a) => filters.assignees.includes(a.login))
      );
    }
    if (filters.ai.length > 0) {
      const includeUnset = filters.ai.includes(UNSET_FILTER_VALUE);
      const values = filters.ai.filter((v) => v !== UNSET_FILTER_VALUE);
      issues = issues.filter((i) =>
        (includeUnset && !i.claudeState) || (i.claudeState && values.includes(i.claudeState))
      );
    }
    if (filters.version.length > 0) {
      const includeUnset = filters.version.includes(UNSET_FILTER_VALUE);
      const values = filters.version.filter((v) => v !== UNSET_FILTER_VALUE);
      issues = issues.filter((i) =>
        (includeUnset && !i.version) || (i.version && values.includes(i.version))
      );
    }
    if (filters.hasPr) {
      issues = issues.filter((i) => i.linkedPrs.length > 0);
    }
    if (filters.labels.length > 0) {
      issues = issues.filter((i) =>
        i.labels.some((l) => filters.labels.includes(l.name))
      );
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      issues = issues.filter((i) => i.title.toLowerCase().includes(q));
    }

    // Sort closed issues by closedAt desc, open issues by createdAt desc
    if (filters.state === "closed") {
      issues = [...issues].sort((a, b) =>
        new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime()
      );
    } else {
      issues = [...issues].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return issues;
  }, [query.data?.issues, filters, weekStart, weekEnd]);

  return {
    ...query,
    issues: filteredIssues,
    allIssues: query.data?.issues ?? [],
    errors: query.data?.errors ?? [],
    totalRepos: query.data?.totalRepos ?? 0,
    fetchedRepos: query.data?.fetchedRepos ?? 0,
  };
}

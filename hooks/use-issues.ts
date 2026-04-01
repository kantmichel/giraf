"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";
import type { NormalizedIssue, FilterConfig } from "@/types/github";

interface IssuesResponse {
  issues: NormalizedIssue[];
  errors: { repo: string; error: string }[];
  totalRepos: number;
  fetchedRepos: number;
}

export function useIssues(filters: FilterConfig, weekOffset = 0) {
  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekEnd = useMemo(
    () => endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );

  const query = useQuery<IssuesResponse>({
    queryKey: ["issues", { state: filters.state, weekOffset: filters.state === "closed" ? weekOffset : undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.state) params.set("state", filters.state);
      if (filters.state === "closed") {
        const sinceDate = subWeeks(weekStart, 2);
        params.set("since", sinceDate.toISOString());
      }
      const res = await fetch(`/api/issues?${params}`);
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    staleTime: 60_000,
  });

  const filteredIssues = useMemo(() => {
    if (!query.data?.issues) return [];
    let issues = query.data.issues;

    // When viewing closed issues, filter by closedAt within the selected week
    if (filters.state === "closed") {
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
      issues = issues.filter((i) => i.status && filters.status.includes(i.status));
    }
    if (filters.priority.length > 0) {
      issues = issues.filter((i) => i.priority && filters.priority.includes(i.priority));
    }
    if (filters.effort.length > 0) {
      issues = issues.filter((i) => i.effort && filters.effort.includes(i.effort));
    }
    if (filters.assignees.length > 0) {
      issues = issues.filter((i) =>
        i.assignees.some((a) => filters.assignees.includes(a.login))
      );
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

    // Sort by closedAt desc when viewing closed issues
    if (filters.state === "closed") {
      issues = [...issues].sort((a, b) =>
        new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime()
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

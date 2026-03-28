"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { NormalizedIssue, FilterConfig } from "@/types/github";

interface IssuesResponse {
  issues: NormalizedIssue[];
  errors: { repo: string; error: string }[];
  totalRepos: number;
  fetchedRepos: number;
}

export function useIssues(filters: FilterConfig) {
  const query = useQuery<IssuesResponse>({
    queryKey: ["issues", { state: filters.state }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.state) params.set("state", filters.state);
      const res = await fetch(`/api/issues?${params}`);
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    staleTime: 60_000,
  });

  const filteredIssues = useMemo(() => {
    if (!query.data?.issues) return [];
    let issues = query.data.issues;

    if (filters.repos.length > 0) {
      issues = issues.filter((i) => filters.repos.includes(i.repo.fullName));
    }
    if (filters.status.length > 0) {
      issues = issues.filter((i) => i.status && filters.status.includes(i.status));
    }
    if (filters.priority.length > 0) {
      issues = issues.filter((i) => i.priority && filters.priority.includes(i.priority));
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

    return issues;
  }, [query.data?.issues, filters]);

  return {
    ...query,
    issues: filteredIssues,
    allIssues: query.data?.issues ?? [],
    errors: query.data?.errors ?? [],
    totalRepos: query.data?.totalRepos ?? 0,
    fetchedRepos: query.data?.fetchedRepos ?? 0,
  };
}

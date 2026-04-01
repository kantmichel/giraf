"use client";

import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import type { NormalizedIssue } from "@/types/github";

interface ClosedIssuesResponse {
  issues: NormalizedIssue[];
  errors: { repo: string; error: string }[];
  totalRepos: number;
  fetchedRepos: number;
}

export function useClosedIssues(enabled = true) {
  return useQuery<ClosedIssuesResponse>({
    queryKey: ["closed-issues-30d"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const res = await fetch(`/api/issues?state=closed&since=${since}`);
      if (!res.ok) throw new Error("Failed to fetch closed issues");
      return res.json();
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

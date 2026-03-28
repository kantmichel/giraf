"use client";

import { useQuery } from "@tanstack/react-query";
import type { NormalizedIssue } from "@/types/github";

interface MyIssuesResponse {
  active: NormalizedIssue[];
  upNext: NormalizedIssue[];
  recentlyCompleted: NormalizedIssue[];
  snoozed: NormalizedIssue[];
}

export function useMyIssues() {
  return useQuery<MyIssuesResponse>({
    queryKey: ["my-issues"],
    queryFn: async () => {
      const res = await fetch("/api/issues/mine");
      if (!res.ok) throw new Error("Failed to fetch my issues");
      return res.json();
    },
    staleTime: 60_000,
  });
}

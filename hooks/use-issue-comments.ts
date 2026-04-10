"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssueComment } from "@/types/github";

export function useIssueComments(
  owner: string | undefined,
  repo: string | undefined,
  number: number | undefined,
  enabled = true
) {
  return useQuery<IssueComment[]>({
    queryKey: ["issue-comments", owner, repo, number],
    queryFn: async () => {
      const res = await fetch(
        `/api/issues/${owner}/${repo}/${number}/comments`
      );
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
    enabled: enabled && !!owner && !!repo && !!number,
    staleTime: 30_000,
  });
}

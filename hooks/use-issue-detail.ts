"use client";

import { useQuery } from "@tanstack/react-query";
import type { NormalizedIssue, IssueComment } from "@/types/github";

export function useIssueDetail(
  owner: string | undefined,
  repo: string | undefined,
  number: number | undefined
) {
  const enabled = Boolean(owner && repo && number);

  const issueQuery = useQuery<NormalizedIssue>({
    queryKey: ["issue", owner, repo, number],
    queryFn: async () => {
      const res = await fetch(`/api/issues/${owner}/${repo}/${number}`);
      if (!res.ok) throw new Error("Failed to fetch issue");
      return res.json();
    },
    enabled,
    staleTime: 30_000,
  });

  const commentsQuery = useQuery<IssueComment[]>({
    queryKey: ["issue-comments", owner, repo, number],
    queryFn: async () => {
      const res = await fetch(`/api/issues/${owner}/${repo}/${number}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled,
    staleTime: 60_000,
  });

  return {
    issue: issueQuery.data,
    comments: commentsQuery.data ?? [],
    isLoading: issueQuery.isLoading || commentsQuery.isLoading,
    isError: issueQuery.isError || commentsQuery.isError,
  };
}

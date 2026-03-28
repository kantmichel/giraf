"use client";

import { useQuery } from "@tanstack/react-query";
import type { NormalizedUser } from "@/types/github";

export function useAssignees(owner: string | undefined, repo: string | undefined) {
  return useQuery<NormalizedUser[]>({
    queryKey: ["assignees", owner, repo],
    queryFn: async () => {
      const res = await fetch(`/api/repos/${owner}/${repo}/assignees`);
      if (!res.ok) throw new Error("Failed to fetch assignees");
      return res.json();
    },
    enabled: Boolean(owner && repo),
    staleTime: 5 * 60 * 1000,
  });
}

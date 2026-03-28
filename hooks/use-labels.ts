"use client";

import { useQuery } from "@tanstack/react-query";
import type { NormalizedLabel } from "@/types/github";

export function useLabels(owner: string | undefined, repo: string | undefined) {
  return useQuery<NormalizedLabel[]>({
    queryKey: ["labels", owner, repo],
    queryFn: async () => {
      const res = await fetch(`/api/repos/${owner}/${repo}/labels`);
      if (!res.ok) throw new Error("Failed to fetch labels");
      return res.json();
    },
    enabled: Boolean(owner && repo),
    staleTime: 5 * 60 * 1000,
  });
}

"use client";

import { useQuery } from "@tanstack/react-query";
import type { GitHubRepo } from "@/types/github";

export function useGitHubRepos() {
  return useQuery<GitHubRepo[]>({
    queryKey: ["github", "repos"],
    queryFn: async () => {
      const res = await fetch("/api/github/repos");
      if (!res.ok) throw new Error("Failed to fetch repos");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

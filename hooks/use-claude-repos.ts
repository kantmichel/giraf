"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useClaudeEnabledRepos() {
  const query = useQuery<{ owner: string; repo: string }[]>({
    queryKey: ["claude-repos"],
    queryFn: async () => {
      const res = await fetch("/api/settings/claude-repos");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const enabledSet = new Set(
    (query.data ?? []).map((r) => `${r.owner}/${r.repo}`)
  );

  return { ...query, enabledSet };
}

export function useToggleClaudeRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ owner, repo, enabled }: { owner: string; repo: string; enabled: boolean }) => {
      const res = await fetch("/api/settings/claude-repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claude-repos"] });
    },
  });
}

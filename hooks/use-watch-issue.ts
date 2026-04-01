"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useWatchStatus(owner: string, repo: string, number: number) {
  return useQuery<{ watching: boolean }>({
    queryKey: ["watch", owner, repo, number],
    queryFn: async () => {
      const res = await fetch(`/api/issues/${owner}/${repo}/${number}/watch`);
      if (!res.ok) throw new Error("Failed to check watch status");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useToggleWatch(owner: string, repo: string, number: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/issues/${owner}/${repo}/${number}/watch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle watch");
      return res.json() as Promise<{ watching: boolean }>;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["watch", owner, repo, number] });
      const previous = queryClient.getQueryData<{ watching: boolean }>(["watch", owner, repo, number]);
      queryClient.setQueryData(["watch", owner, repo, number], (old: { watching: boolean } | undefined) => ({
        watching: !(old?.watching ?? false),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["watch", owner, repo, number], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["watch", owner, repo, number] });
    },
  });
}

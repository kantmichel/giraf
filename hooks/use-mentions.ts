"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface MentionSearchRow {
  id: number;
  title: string;
  repoFullName: string;
  number: number;
  type: "issue" | "pull";
  state: "open" | "closed";
  htmlUrl: string;
  updatedAt: string;
  author: string;
}

/** The full mention history, from GitHub search rather than the bell's feed. */
export function useMentions() {
  const query = useQuery<{ mentions: MentionSearchRow[] }>({
    queryKey: ["mentions"],
    queryFn: async () => {
      const res = await fetch("/api/mentions");
      if (!res.ok) throw new Error("Failed to fetch mentions");
      return res.json();
    },
    staleTime: 60_000,
  });

  return { ...query, mentions: query.data?.mentions ?? [] };
}

/** Hide one mention from the bell. The mentions page still lists it. */
export function useDismissMention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mentionId: string) => {
      const res = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentionId }),
      });
      if (!res.ok) throw new Error("Failed to dismiss mention");
      return res.json();
    },
    onMutate: async (mentionId: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData(["notifications"]);
      queryClient.setQueryData(
        ["notifications"],
        (old: { mentions?: { id: string }[] } | undefined) =>
          old
            ? { ...old, mentions: (old.mentions ?? []).filter((m) => m.id !== mentionId) }
            : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notifications"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

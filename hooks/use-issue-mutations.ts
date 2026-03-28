"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";

interface UpdateIssueParams {
  owner: string;
  repo: string;
  number: number;
  updates: {
    title?: string;
    state?: "open" | "closed";
    labels?: string[];
    assignees?: string[];
  };
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation<NormalizedIssue, Error, UpdateIssueParams>({
    mutationFn: async ({ owner, repo, number, updates }) => {
      const res = await fetch(`/api/issues/${owner}/${repo}/${number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update issue");
      }
      return res.json();
    },
    onSuccess: (_data, { owner, repo, number }) => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", owner, repo, number] });
      toast.success("Issue updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

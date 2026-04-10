"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrackedRepoRow } from "@/types/github";
import { toast } from "sonner";

export function useTrackedRepos() {
  return useQuery<TrackedRepoRow[]>({
    queryKey: ["tracked-repos"],
    queryFn: async () => {
      const res = await fetch("/api/workspaces/repos");
      if (!res.ok) throw new Error("Failed to fetch tracked repos");
      return res.json();
    },
  });
}

export function useAddTrackedRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { owner: string; repo: string }) => {
      const res = await fetch("/api/workspaces/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add repo");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tracked-repos"] });
      const labelCount = data.labels?.created?.length || 0;
      toast.success(
        `Added ${variables.owner}/${variables.repo}` +
          (labelCount > 0 ? ` — created ${labelCount} labels` : "")
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSyncLabels() {
  return useMutation({
    mutationFn: async ({ owner, repo }: { owner: string; repo: string }) => {
      const res = await fetch(`/api/repos/${owner}/${repo}/labels/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync labels");
      }
      return res.json() as Promise<{ created: string[]; existing: string[] }>;
    },
    onSuccess: (data, variables) => {
      if (data.created.length > 0) {
        toast.success(
          `${variables.owner}/${variables.repo} — created ${data.created.length} missing labels`
        );
      } else {
        toast.success(
          `${variables.owner}/${variables.repo} — all labels present`
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveTrackedRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ owner, repo }: { owner: string; repo: string }) => {
      const res = await fetch(`/api/workspaces/repos/${owner}/${repo}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove repo");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tracked-repos"] });
      toast.success(`Removed ${variables.owner}/${variables.repo}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

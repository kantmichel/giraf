"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ImpactLabelDiscovery } from "@/lib/github/impact-labels";

interface ImpactLabelsResponse {
  labels: ImpactLabelDiscovery[];
  totalRepos: number;
}

export function useImpactLabels() {
  return useQuery<ImpactLabelsResponse>({
    queryKey: ["impact-labels"],
    queryFn: async () => {
      const res = await fetch("/api/labels/impact");
      if (!res.ok) throw new Error("Failed to fetch impact labels");
      return res.json();
    },
  });
}

export function useSyncImpactLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { type: string; color: string; description?: string }) => {
      const res = await fetch("/api/labels/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync impact label");
      }
      return res.json() as Promise<{
        created: string[];
        existing: string[];
        failed: { repo: string; error: string }[];
      }>;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["impact-labels"] });
      const fullName = `impact: ${variables.type}`;
      const parts: string[] = [];
      if (data.created.length > 0) parts.push(`created in ${data.created.length}`);
      if (data.existing.length > 0) parts.push(`already in ${data.existing.length}`);
      if (data.failed.length > 0) parts.push(`failed in ${data.failed.length}`);
      const summary = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
      toast.success(`${fullName}${summary}`);
      if (data.failed.length > 0) {
        for (const f of data.failed) toast.error(`${f.repo}: ${f.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

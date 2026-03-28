"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";

interface TriageResponse {
  issues: NormalizedIssue[];
  count: number;
}

export function useTriageIssues() {
  return useQuery<TriageResponse>({
    queryKey: ["triage"],
    queryFn: async () => {
      const res = await fetch("/api/issues/triage");
      if (!res.ok) throw new Error("Failed to fetch triage issues");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useTriageCount() {
  return useQuery<{ count: number }>({
    queryKey: ["triage-count"],
    queryFn: async () => {
      const res = await fetch("/api/issues/triage/count");
      if (!res.ok) throw new Error("Failed to fetch triage count");
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

interface TriageActionParams {
  owner: string;
  repo: string;
  number: number;
  action: "accept" | "decline" | "snooze";
  priority?: string;
  assignees?: string[];
  snoozedUntil?: string;
  wakeOnActivity?: boolean;
}

export function useTriageAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TriageActionParams) => {
      const res = await fetch(
        `/api/issues/${params.owner}/${params.repo}/${params.number}/triage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: params.action,
            priority: params.priority,
            assignees: params.assignees,
            snoozedUntil: params.snoozedUntil,
            wakeOnActivity: params.wakeOnActivity,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Triage action failed");
      }
      return res.json();
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["triage"] });
      queryClient.invalidateQueries({ queryKey: ["triage-count"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });

      const messages = {
        accept: "Issue accepted",
        decline: "Issue declined",
        snooze: "Issue snoozed",
      };
      toast.success(messages[params.action]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

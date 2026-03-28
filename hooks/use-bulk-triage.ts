"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";

interface BulkTriageParams {
  issues: NormalizedIssue[];
  action: "accept" | "decline" | "snooze";
  priority?: string;
  assignees?: string[];
  snoozedUntil?: string;
  wakeOnActivity?: boolean;
}

interface TriageResponse {
  issues: NormalizedIssue[];
  count: number;
}

export function useBulkTriageAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BulkTriageParams) => {
      const results = await Promise.allSettled(
        params.issues.map((issue) =>
          fetch(
            `/api/issues/${issue.repo.owner}/${issue.repo.name}/${issue.number}/triage`,
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
          ).then((r) => {
            if (!r.ok) throw new Error(`Failed for #${issue.number}`);
            return r.json();
          })
        )
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      return { succeeded, failed, total: params.issues.length };
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ["triage"] });
      await queryClient.cancelQueries({ queryKey: ["triage-count"] });

      const previousTriage = queryClient.getQueryData<TriageResponse>(["triage"]);
      const previousCount = queryClient.getQueryData<{ count: number }>(["triage-count"]);

      // Optimistically remove all selected issues
      const removeKeys = new Set(
        params.issues.map((i) => `${i.repo.fullName}:${i.number}`)
      );

      if (previousTriage) {
        queryClient.setQueryData<TriageResponse>(["triage"], {
          issues: previousTriage.issues.filter(
            (i) => !removeKeys.has(`${i.repo.fullName}:${i.number}`)
          ),
          count: previousTriage.count - params.issues.length,
        });
      }
      if (previousCount) {
        queryClient.setQueryData(["triage-count"], {
          count: Math.max(0, previousCount.count - params.issues.length),
        });
      }

      return { previousTriage, previousCount };
    },
    onSuccess: (data, params) => {
      queryClient.invalidateQueries({ queryKey: ["triage"] });
      queryClient.invalidateQueries({ queryKey: ["triage-count"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["my-issues"] });

      const messages = {
        accept: `Accepted ${data.succeeded} issue${data.succeeded !== 1 ? "s" : ""}`,
        decline: `Declined ${data.succeeded} issue${data.succeeded !== 1 ? "s" : ""}`,
        snooze: `Snoozed ${data.succeeded} issue${data.succeeded !== 1 ? "s" : ""}`,
      };
      toast.success(messages[params.action]);

      if (data.failed > 0) {
        toast.error(`${data.failed} issue${data.failed !== 1 ? "s" : ""} failed`);
      }
    },
    onError: (_error, _params, context: any) => {
      if (context?.previousTriage) {
        queryClient.setQueryData(["triage"], context.previousTriage);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(["triage-count"], context.previousCount);
      }
      toast.error("Bulk action failed");
    },
  });
}

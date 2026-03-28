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

interface MyIssuesResponse {
  active: NormalizedIssue[];
  upNext: NormalizedIssue[];
  recentlyCompleted: NormalizedIssue[];
  snoozed: NormalizedIssue[];
}

function moveIssueBetweenSections(
  data: MyIssuesResponse,
  issue: NormalizedIssue,
  newLabels: string[]
): MyIssuesResponse {
  const newStatus = newLabels
    .find((l) => l.startsWith("status: "))
    ?.replace("status: ", "") as NormalizedIssue["status"];

  const updatedIssue: NormalizedIssue = {
    ...issue,
    status: newStatus ?? null,
    labels: newLabels.map((name, i) => ({
      id: issue.labels.find((l) => l.name === name)?.id ?? -(i + 1),
      name,
      color: issue.labels.find((l) => l.name === name)?.color ?? "666666",
      description: null,
    })),
  };

  const issueKey = `${issue.repo.fullName}:${issue.number}`;
  const remove = (arr: NormalizedIssue[]) =>
    arr.filter((i) => `${i.repo.fullName}:${i.number}` !== issueKey);

  const result = {
    active: remove(data.active),
    upNext: remove(data.upNext),
    recentlyCompleted: data.recentlyCompleted,
    snoozed: data.snoozed,
  };

  if (newStatus === "doing" || newStatus === "in review") {
    result.active = [updatedIssue, ...result.active];
  } else if (newStatus === "to do" || newStatus === null) {
    result.upNext = [updatedIssue, ...result.upNext];
  }

  return result;
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation<NormalizedIssue, Error, UpdateIssueParams, { previous: MyIssuesResponse | undefined }>({
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
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["my-issues"] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<MyIssuesResponse>(["my-issues"]);

      // Optimistically update my-issues cache
      if (previous && params.updates.labels) {
        const allIssues = [
          ...previous.active,
          ...previous.upNext,
          ...previous.recentlyCompleted,
          ...previous.snoozed,
        ];
        const issue = allIssues.find(
          (i) => i.repo.owner === params.owner && i.repo.name === params.repo && i.number === params.number
        );
        if (issue) {
          queryClient.setQueryData<MyIssuesResponse>(
            ["my-issues"],
            moveIssueBetweenSections(previous, issue, params.updates.labels)
          );
        }
      }

      return { previous };
    },
    onError: (_error, _params, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["my-issues"], context.previous);
      }
      toast.error("Failed to update issue");
    },
    onSettled: () => {
      // Always refetch to sync with server truth
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["my-issues"] });
    },
    onSuccess: (_data, { owner, repo, number }) => {
      queryClient.invalidateQueries({ queryKey: ["issue", owner, repo, number] });
      toast.success("Issue updated");
    },
  });
}

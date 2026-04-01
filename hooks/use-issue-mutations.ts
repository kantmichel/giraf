"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";
import { extractClaudeState } from "@/lib/claude-workflow";

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

interface IssuesResponse {
  issues: NormalizedIssue[];
  errors: { repo: string; error: string }[];
  totalRepos: number;
  fetchedRepos: number;
}

interface MyIssuesResponse {
  active: NormalizedIssue[];
  upNext: NormalizedIssue[];
  recentlyCompleted: NormalizedIssue[];
  snoozed: NormalizedIssue[];
}

// Apply updates to a NormalizedIssue, recalculating status/priority from labels
function applyUpdateToIssue(
  issue: NormalizedIssue,
  updates: UpdateIssueParams["updates"]
): NormalizedIssue {
  let updated = { ...issue };

  if (updates.labels) {
    const newLabels = updates.labels.map((name, i) => ({
      id: issue.labels.find((l) => l.name === name)?.id ?? -(i + 1),
      name,
      color: issue.labels.find((l) => l.name === name)?.color ?? "666666",
      description: null,
    }));

    const statusLabel = updates.labels.find((l) => l.startsWith("status: "));
    const priorityLabel = updates.labels.find((l) => l.startsWith("priority: "));
    const effortLabel = updates.labels.find((l) => l.startsWith("effort: "));

    updated = {
      ...updated,
      labels: newLabels,
      status: statusLabel
        ? (statusLabel.replace("status: ", "") as NormalizedIssue["status"])
        : null,
      priority: priorityLabel
        ? (priorityLabel.replace("priority: ", "") as NormalizedIssue["priority"])
        : null,
      effort: effortLabel
        ? (effortLabel.replace("effort: ", "") as NormalizedIssue["effort"])
        : null,
      claudeState: extractClaudeState(newLabels),
    };
  }

  if (updates.assignees) {
    updated.assignees = updates.assignees.map((login) => {
      const existing = issue.assignees.find((a) => a.login === login);
      return existing ?? { id: 0, login, avatarUrl: `https://github.com/${login}.png` };
    });
  }

  if (updates.state) {
    updated.state = updates.state;
    // Mirror server-side: auto-set status to "done" when closing
    if (updates.state === "closed" && updated.status !== "done") {
      updated.status = "done";
      updated.labels = [
        ...updated.labels.filter((l) => !l.name.startsWith("status: ")),
        { id: -999, name: "status: done", color: "0e8a16", description: null },
      ];
      updated.closedAt = updated.closedAt ?? new Date().toISOString();
    }
  }

  if (updates.title) {
    updated.title = updates.title;
  }

  return updated;
}

// Update an issue within an array, return new array
function updateIssueInList(
  issues: NormalizedIssue[],
  owner: string,
  repo: string,
  number: number,
  updates: UpdateIssueParams["updates"]
): NormalizedIssue[] {
  return issues.map((issue) =>
    issue.repo.owner === owner && issue.repo.name === repo && issue.number === number
      ? applyUpdateToIssue(issue, updates)
      : issue
  );
}

// Recalculate my-issues sections after an update
function recalculateMyIssues(
  data: MyIssuesResponse,
  owner: string,
  repo: string,
  number: number,
  updates: UpdateIssueParams["updates"]
): MyIssuesResponse {
  const allIssues = [
    ...data.active,
    ...data.upNext,
    ...data.recentlyCompleted,
    ...data.snoozed,
  ];

  const issue = allIssues.find(
    (i) => i.repo.owner === owner && i.repo.name === repo && i.number === number
  );
  if (!issue) return data;

  const updated = applyUpdateToIssue(issue, updates);
  const issueKey = `${issue.repo.fullName}:${issue.number}`;
  const remove = (arr: NormalizedIssue[]) =>
    arr.filter((i) => `${i.repo.fullName}:${i.number}` !== issueKey);

  const result = {
    active: remove(data.active),
    upNext: remove(data.upNext),
    recentlyCompleted: remove(data.recentlyCompleted),
    snoozed: remove(data.snoozed),
  };

  if (updated.state === "closed") {
    result.recentlyCompleted = [updated, ...result.recentlyCompleted];
  } else if (updated.status === "doing" || updated.status === "in review") {
    result.active = [updated, ...result.active];
  } else {
    result.upNext = [updated, ...result.upNext];
  }

  return result;
}

interface TriageCache {
  issues: NormalizedIssue[];
  count: number;
}

interface MutationContext {
  previousIssues: Map<string, IssuesResponse | undefined>;
  previousMyIssues: MyIssuesResponse | undefined;
  previousTriage: TriageCache | undefined;
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation<NormalizedIssue, Error, UpdateIssueParams, MutationContext>({
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
      await queryClient.cancelQueries({ queryKey: ["issues"] });
      await queryClient.cancelQueries({ queryKey: ["my-issues"] });
      await queryClient.cancelQueries({ queryKey: ["triage"] });

      // Snapshot all issues queries
      const previousIssues = new Map<string, IssuesResponse | undefined>();
      const issuesQueries = queryClient.getQueriesData<IssuesResponse>({ queryKey: ["issues"] });
      for (const [key, data] of issuesQueries) {
        previousIssues.set(JSON.stringify(key), data);
        if (data) {
          queryClient.setQueryData<IssuesResponse>(key, {
            ...data,
            issues: updateIssueInList(data.issues, params.owner, params.repo, params.number, params.updates),
          });
        }
      }

      // Snapshot and update my-issues
      const previousMyIssues = queryClient.getQueryData<MyIssuesResponse>(["my-issues"]);
      if (previousMyIssues) {
        queryClient.setQueryData<MyIssuesResponse>(
          ["my-issues"],
          recalculateMyIssues(previousMyIssues, params.owner, params.repo, params.number, params.updates)
        );
      }

      // Optimistically update triage cache
      const previousTriage = queryClient.getQueryData<TriageCache>(["triage"]);
      if (previousTriage) {
        queryClient.setQueryData<TriageCache>(["triage"], {
          ...previousTriage,
          issues: updateIssueInList(previousTriage.issues, params.owner, params.repo, params.number, params.updates),
        });
      }

      return { previousIssues, previousMyIssues, previousTriage };
    },
    onError: (_error, _params, context) => {
      // Rollback all caches
      if (context?.previousIssues) {
        for (const [keyStr, data] of context.previousIssues) {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        }
      }
      if (context?.previousMyIssues) {
        queryClient.setQueryData(["my-issues"], context.previousMyIssues);
      }
      if (context?.previousTriage) {
        queryClient.setQueryData(["triage"], context.previousTriage);
      }
      toast.error("Failed to update issue");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["my-issues"] });
      queryClient.invalidateQueries({ queryKey: ["triage"] });
    },
    onSuccess: (data: any, { owner, repo, number }) => {
      queryClient.invalidateQueries({ queryKey: ["issue", owner, repo, number] });

      if (data?.promotion) {
        const p = data.promotion;
        toast.success(
          `Promoted #${p.promotedIssue.number} from ${p.fromPriority} to ${p.toPriority}`,
          {
            action: {
              label: "View",
              onClick: () => {
                window.open(p.promotedIssue.htmlUrl, "_blank");
              },
            },
          }
        );
      } else {
        toast.success("Issue updated");
      }
    },
  });
}

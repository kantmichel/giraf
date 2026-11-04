"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";
import { extractClaudeState } from "@/lib/claude-workflow";
import { labelFields } from "@/lib/issue-labels";
import { useOpenIssue } from "@/hooks/use-open-issue";
import { toastIssueUpdated, toastIssueUpdateFailed } from "@/components/issues/issue-toast";

interface UpdateIssueParams {
  owner: string;
  repo: string;
  number: number;
  updates: {
    title?: string;
    state?: "open" | "closed";
    labels?: string[];
    assignees?: string[];
    /** GitHub's issue type by name, e.g. "Epic". */
    type?: string;
  };
}

interface IssuesResponse {
  issues: NormalizedIssue[];
  errors: { repo: string; error: string }[];
  totalRepos: number;
  fetchedRepos: number;
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

    updated = {
      ...updated,
      labels: newLabels,
      // Same parser as the server, so the optimistic copy can't disagree with
      // what the next fetch returns.
      ...labelFields(updates.labels),
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

  if (updates.type !== undefined) {
    updated.issueType = updates.type;
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

/** What the update route answers: the issue, and a promotion it caused. */
type UpdateResult = NormalizedIssue & {
  promotion?: { promotedIssue: { number: number; htmlUrl: string }; fromPriority: string; toPriority: string } | null;
};

interface TriageCache {
  issues: NormalizedIssue[];
  count: number;
}

interface MutationContext {
  previousIssues: Map<string, IssuesResponse | undefined>;
  previousTriage: TriageCache | undefined;
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();
  const openIssue = useOpenIssue();

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

      // Optimistically update triage cache
      const previousTriage = queryClient.getQueryData<TriageCache>(["triage"]);
      if (previousTriage) {
        queryClient.setQueryData<TriageCache>(["triage"], {
          ...previousTriage,
          issues: updateIssueInList(previousTriage.issues, params.owner, params.repo, params.number, params.updates),
        });
      }

      return { previousIssues, previousTriage };
    },
    onError: (error, { repo, number }, context) => {
      // Rollback all caches
      if (context?.previousIssues) {
        for (const [keyStr, data] of context.previousIssues) {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        }
      }
      if (context?.previousTriage) {
        queryClient.setQueryData(["triage"], context.previousTriage);
      }
      toastIssueUpdateFailed({ repo: { name: repo }, number }, error.message, openIssue);
    },
    onSettled: (data, error, params) => {
      // Reloading the lists lists every tracked repo again, so only when the
      // copy in place can't be right: a failed save, a close or reopen (the
      // issue moves between the open and closed lists), or a promotion (it
      // changed another issue). Any other edit is in place already (onSuccess).
      const promoted = !!(data as UpdateResult | undefined)?.promotion;
      if (error || params.updates.state !== undefined || promoted) {
        queryClient.invalidateQueries({ queryKey: ["issues"] });
        queryClient.invalidateQueries({ queryKey: ["triage"] });
      }
    },
    onSuccess: (result, { owner, repo, number }) => {
      const data = result as UpdateResult;
      queryClient.invalidateQueries({ queryKey: ["issue", owner, repo, number] });

      // GitHub's copy in place of the optimistic one. It comes without what
      // the list's server adds (features, release version), so those stay.
      const same = (i: NormalizedIssue) => i.repo.owner === owner && i.repo.name === repo && i.number === number;
      const merge = (i: NormalizedIssue): NormalizedIssue =>
        same(i) ? { ...i, ...data, features: i.features, version: i.version } : i;
      for (const [key, list] of queryClient.getQueriesData<IssuesResponse>({ queryKey: ["issues"] })) {
        if (list) queryClient.setQueryData<IssuesResponse>(key, { ...list, issues: list.issues.map(merge) });
      }
      const triage = queryClient.getQueryData<TriageCache>(["triage"]);
      if (triage) queryClient.setQueryData<TriageCache>(["triage"], { ...triage, issues: triage.issues.map(merge) });

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
        toastIssueUpdated({ repo: { name: repo }, number }, data?.title, openIssue);
      }
    },
  });
}

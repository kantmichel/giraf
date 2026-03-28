"use client";

import { useRef } from "react";
import { RelativeTime } from "@/components/shared/relative-time";
import { IssueStatusEditor } from "./issue-status-editor";
import { IssuePriorityEditor } from "./issue-priority-editor";
import { IssueAssigneesEditor } from "./issue-assignees-editor";
import { IssueLabelsEditor } from "./issue-labels-editor";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailMetadataProps {
  issue: NormalizedIssue;
}

export function IssueDetailMetadata({ issue }: IssueDetailMetadataProps) {
  const updateMutation = useUpdateIssue();

  // Track the latest labels locally to avoid race conditions
  // when status and priority are changed in quick succession
  const latestLabelsRef = useRef<string[]>(issue.labels.map((l) => l.name));

  // Sync ref when the issue prop updates (e.g., from cache)
  if (issue.labels.map((l) => l.name).join(",") !== latestLabelsRef.current.join(",")) {
    latestLabelsRef.current = issue.labels.map((l) => l.name);
  }

  function handleLabelsUpdate(labels: string[]) {
    latestLabelsRef.current = labels;
    updateMutation.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels },
    });
  }

  function handleAssigneesUpdate(assignees: string[]) {
    updateMutation.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { assignees },
    });
  }

  // Derive status/priority from the latest local labels (not stale prop)
  const currentLabels = latestLabelsRef.current;
  const currentStatus = currentLabels
    .find((l) => l.startsWith("status: "))
    ?.replace("status: ", "") ?? null;
  const currentPriority = currentLabels
    .find((l) => l.startsWith("priority: "))
    ?.replace("priority: ", "") ?? null;

  return (
    <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
      <span className="text-muted-foreground">Status</span>
      <IssueStatusEditor
        currentStatus={currentStatus}
        allLabels={currentLabels}
        onUpdate={handleLabelsUpdate}
      />

      <span className="text-muted-foreground">Priority</span>
      <IssuePriorityEditor
        currentPriority={currentPriority}
        allLabels={currentLabels}
        onUpdate={handleLabelsUpdate}
      />

      <span className="text-muted-foreground">Assignees</span>
      <IssueAssigneesEditor
        owner={issue.repo.owner}
        repo={issue.repo.name}
        currentAssignees={issue.assignees}
        onUpdate={handleAssigneesUpdate}
      />

      <span className="text-muted-foreground">Labels</span>
      <IssueLabelsEditor
        owner={issue.repo.owner}
        repo={issue.repo.name}
        currentLabels={currentLabels}
        onUpdate={handleLabelsUpdate}
      />

      <span className="text-muted-foreground">Milestone</span>
      <span>{issue.milestone?.title ?? "—"}</span>

      <span className="text-muted-foreground">Created</span>
      <RelativeTime date={issue.createdAt} />

      <span className="text-muted-foreground">Updated</span>
      <RelativeTime date={issue.updatedAt} />
    </div>
  );
}

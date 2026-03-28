"use client";

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
  const allLabelNames = issue.labels.map((l) => l.name);
  const isPending = updateMutation.isPending;

  function handleLabelsUpdate(labels: string[]) {
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

  return (
    <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
      <span className="text-muted-foreground">Status</span>
      <IssueStatusEditor
        currentStatus={issue.status}
        allLabels={allLabelNames}
        onUpdate={handleLabelsUpdate}
        disabled={isPending}
      />

      <span className="text-muted-foreground">Priority</span>
      <IssuePriorityEditor
        currentPriority={issue.priority}
        allLabels={allLabelNames}
        onUpdate={handleLabelsUpdate}
        disabled={isPending}
      />

      <span className="text-muted-foreground">Assignees</span>
      <IssueAssigneesEditor
        owner={issue.repo.owner}
        repo={issue.repo.name}
        currentAssignees={issue.assignees}
        onUpdate={handleAssigneesUpdate}
        disabled={isPending}
      />

      <span className="text-muted-foreground">Labels</span>
      <IssueLabelsEditor
        owner={issue.repo.owner}
        repo={issue.repo.name}
        currentLabels={allLabelNames}
        onUpdate={handleLabelsUpdate}
        disabled={isPending}
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

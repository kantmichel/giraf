"use client";

import { useState, useEffect } from "react";
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

  // Local labels state to avoid race conditions between rapid edits
  // AND to trigger re-renders when labels change
  const [localLabels, setLocalLabels] = useState<string[]>(
    issue.labels.map((l) => l.name)
  );

  // Sync from prop when issue changes (e.g., different issue selected, or cache update)
  useEffect(() => {
    setLocalLabels(issue.labels.map((l) => l.name));
  }, [issue.id, issue.labels]);

  function handleLabelsUpdate(labels: string[]) {
    setLocalLabels(labels); // Update local state immediately
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

  // Derive status/priority from local labels (always fresh)
  const currentStatus = localLabels
    .find((l) => l.startsWith("status: "))
    ?.replace("status: ", "") ?? null;
  const currentPriority = localLabels
    .find((l) => l.startsWith("priority: "))
    ?.replace("priority: ", "") ?? null;

  return (
    <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
      <span className="text-muted-foreground">Status</span>
      <IssueStatusEditor
        currentStatus={currentStatus}
        allLabels={localLabels}
        onUpdate={handleLabelsUpdate}
      />

      <span className="text-muted-foreground">Priority</span>
      <IssuePriorityEditor
        currentPriority={currentPriority}
        allLabels={localLabels}
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
        currentLabels={localLabels}
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

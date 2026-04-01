"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/shared/relative-time";
import { IssueStatusEditor } from "./issue-status-editor";
import { IssuePriorityEditor } from "./issue-priority-editor";
import { IssueEffortEditor } from "./issue-effort-editor";
import { IssueAssigneesEditor } from "./issue-assignees-editor";
import { IssueLabelsEditor } from "./issue-labels-editor";
import { IssueAiStatus } from "./issue-ai-status";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { useClaudeEnabledRepos } from "@/hooks/use-claude-repos";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailMetadataProps {
  issue: NormalizedIssue;
}

export function IssueDetailMetadata({ issue }: IssueDetailMetadataProps) {
  const updateMutation = useUpdateIssue();
  const { enabledSet } = useClaudeEnabledRepos();
  const claudeEnabled = enabledSet.has(issue.repo.fullName);

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
  const currentEffort = localLabels
    .find((l) => l.startsWith("effort: "))
    ?.replace("effort: ", "") ?? null;

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

      <span className="text-muted-foreground">Effort</span>
      <IssueEffortEditor
        currentEffort={currentEffort}
        allLabels={localLabels}
        onUpdate={handleLabelsUpdate}
      />

      {claudeEnabled && (
        <>
          <span className="text-muted-foreground">AI</span>
          <div className="flex items-center justify-center">
            <IssueAiStatus issue={issue} claudeEnabled={claudeEnabled} />
          </div>
        </>
      )}

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

      <span className="text-muted-foreground">Created by</span>
      <div className="flex items-center gap-2">
        <Avatar className="size-5">
          <AvatarImage src={issue.createdBy.avatarUrl} alt={issue.createdBy.login} />
          <AvatarFallback className="text-[8px]">{issue.createdBy.login[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="text-sm">{issue.createdBy.login}</span>
      </div>

      <span className="text-muted-foreground">Created</span>
      <RelativeTime date={issue.createdAt} />

      <span className="text-muted-foreground">Updated</span>
      <RelativeTime date={issue.updatedAt} />

      {issue.closedAt && (
        <>
          <span className="text-muted-foreground">Closed</span>
          <RelativeTime date={issue.closedAt} />
        </>
      )}
    </div>
  );
}

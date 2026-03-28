"use client";

import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { TriageActions } from "./triage-actions";
import type { NormalizedIssue } from "@/types/github";

interface TriageIssueCardProps {
  issue: NormalizedIssue;
  onAccept: (priority: string, assignees: string[]) => void;
  onDecline: () => void;
  onSnooze: (until: string | null, wakeOnActivity: boolean) => void;
  onTitleClick: () => void;
  disabled?: boolean;
}

export function TriageIssueCard({
  issue,
  onAccept,
  onDecline,
  onSnooze,
  onTitleClick,
  disabled,
}: TriageIssueCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            className="text-left font-medium hover:underline line-clamp-2"
            onClick={onTitleClick}
          >
            {issue.title}
          </button>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">#{issue.number}</span>
            <IssueRepoBadge repo={issue.repo.fullName} />
            <RelativeTime date={issue.createdAt} />
          </div>
        </div>
      </div>
      {issue.body && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {issue.body.replace(/[#*`\[\]]/g, "").trim()}
        </p>
      )}
      <TriageActions
        repoOwner={issue.repo.owner}
        repoName={issue.repo.name}
        onAccept={onAccept}
        onDecline={onDecline}
        onSnooze={onSnooze}
        disabled={disabled}
      />
    </div>
  );
}

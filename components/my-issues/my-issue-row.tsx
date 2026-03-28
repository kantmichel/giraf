"use client";

import { IssueStatusBadge } from "@/components/issues/issue-status-badge";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import type { NormalizedIssue } from "@/types/github";

interface MyIssueRowProps {
  issue: NormalizedIssue;
  onClick: () => void;
}

export function MyIssueRow({ issue, onClick }: MyIssueRowProps) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent"
      onClick={onClick}
    >
      <IssueStatusBadge status={issue.status} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {issue.title}
      </span>
      <IssueRepoBadge repo={issue.repo.fullName} />
      <IssuePriorityBadge priority={issue.priority} />
      <RelativeTime date={issue.updatedAt} />
    </button>
  );
}

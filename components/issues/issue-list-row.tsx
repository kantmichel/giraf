"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IssueStatusBadge } from "@/components/issues/issue-status-badge";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import type { NormalizedIssue } from "@/types/github";

interface IssueListRowProps {
  issue: NormalizedIssue;
  onClick: () => void;
  draggable?: boolean;
}

export function IssueListRow({ issue, onClick, draggable = false }: IssueListRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${issue.repo.fullName}:${issue.number}`,
    disabled: !draggable,
    data: { issue },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 rounded-md hover:bg-accent"
    >
      {draggable && (
        <span
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab items-center px-1 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </span>
      )}
      <button
        className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
        onClick={onClick}
      >
        <IssueStatusBadge status={issue.status} />
        {issue.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {issue.assignees.map((a) => (
              <Avatar key={a.login} className="size-5 border border-background">
                <AvatarImage src={a.avatarUrl} alt={a.login} />
                <AvatarFallback className="text-[8px]">{a.login[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {issue.title}
        </span>
        <IssueRepoBadge repo={issue.repo.fullName} />
        <IssuePriorityBadge priority={issue.priority} />
        <RelativeTime date={issue.updatedAt} />
      </button>
    </div>
  );
}

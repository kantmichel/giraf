"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import type { NormalizedIssue } from "@/types/github";

interface KanbanCardProps {
  issue: NormalizedIssue;
  onClick: () => void;
}

const priorityBorderColors: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-green-500",
};

export function KanbanCard({ issue, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${issue.repo.fullName}:${issue.number}`,
    data: { issue },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const borderColor = issue.priority
    ? priorityBorderColors[issue.priority] ?? "border-l-border"
    : "border-l-border";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-md border border-l-[3px] ${borderColor} bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing`}
      onClick={onClick}
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug">
        {issue.title}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">#{issue.number}</span>
          <IssueRepoBadge repo={issue.repo.fullName} />
        </div>
        <div className="flex items-center gap-1">
          <IssuePriorityBadge priority={issue.priority} />
          {issue.assignees.slice(0, 2).map((a) => (
            <Avatar key={a.id} className="size-5 border border-background">
              <AvatarImage src={a.avatarUrl} alt={a.login} />
              <AvatarFallback className="text-[8px]">{a.login[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    </div>
  );
}

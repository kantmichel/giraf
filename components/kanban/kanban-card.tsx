"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Zap } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { computeWsjf, formatWsjf } from "@/lib/wsjf";
import { cn } from "@/lib/utils";
import type { NormalizedIssue } from "@/types/github";

interface KanbanCardProps {
  issue: NormalizedIssue;
  onClick: () => void;
  showTime?: boolean;
  timeField?: string;
  emphasizeWsjf?: boolean;
}

export function KanbanCard({ issue, onClick, showTime, timeField, emphasizeWsjf }: KanbanCardProps) {
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

  const priorityBorderColors: Record<string, string> = {
    critical: "#b6020540",
    high: "#d93f0b40",
    medium: "#fbca0450",
    low: "#0e8a1640",
  };

  const borderStyle = issue.priority
    ? { borderColor: priorityBorderColors[issue.priority] }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...borderStyle }}
      className="flex rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <span
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab items-center px-1.5 text-muted-foreground/30 hover:text-muted-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </span>
      <button
        className="min-w-0 flex-1 p-3 pl-0 text-left"
        onClick={onClick}
      >
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {issue.title}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">#{issue.number}</span>
            <IssueRepoBadge repo={issue.repo.fullName} />
            {(() => {
              const score = computeWsjf(issue.priority, issue.effort, issue.impacts);
              if (score === null) return null;
              const boosted = issue.impacts.length > 0;
              const tooltip = boosted
                ? `WSJF: priority(${issue.priority}) \u00f7 effort(${issue.effort}) \u00d7 impact(${issue.impacts.join(", ")})`
                : `WSJF: priority(${issue.priority}) \u00f7 effort(${issue.effort})`;
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1 text-[10px] tabular-nums",
                    boosted
                      ? "bg-[#7057ff]/10 font-semibold text-[#7057ff]"
                      : emphasizeWsjf
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground"
                  )}
                  title={tooltip}
                >
                  {boosted && <Zap className="size-2.5" />}
                  {formatWsjf(score)}
                </span>
              );
            })()}
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
        {showTime && (() => {
          const timeMap: Record<string, string | null> = {
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            closedAt: issue.closedAt,
          };
          const date = timeField ? timeMap[timeField] : null;
          return date ? (
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              <RelativeTime date={date} />
            </div>
          ) : null;
        })()}
      </button>
    </div>
  );
}

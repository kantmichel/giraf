"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PanelLeftClose } from "lucide-react";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils";
import type { NormalizedIssue } from "@/types/github";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  issues: NormalizedIssue[];
  onIssueClick: (issue: NormalizedIssue) => void;
  onCollapse?: () => void;
}

export function KanbanColumn({
  id,
  title,
  color,
  issues,
  onIssueClick,
  onCollapse,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const issueIds = issues.map((i) => `${i.repo.fullName}:${i.number}`);

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <div
          className="size-2.5 rounded-full"
          style={{ backgroundColor: `#${color}` }}
        />
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">({issues.length})</span>
        {onCollapse && (
          <button
            className="ml-auto text-muted-foreground/50 hover:text-muted-foreground"
            onClick={onCollapse}
          >
            <PanelLeftClose className="size-3.5" />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver
            ? "border-primary/50 bg-accent/50"
            : "border-transparent bg-muted/30"
        )}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issues.length === 0 ? (
            <p
              className={cn(
                "py-8 text-center text-xs text-muted-foreground",
                isOver && "text-primary"
              )}
            >
              {isOver ? "Drop here" : "No issues"}
            </p>
          ) : (
            issues.map((issue) => (
              <KanbanCard
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick(issue)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MyIssueRow } from "./my-issue-row";
import { cn } from "@/lib/utils";
import type { NormalizedIssue } from "@/types/github";

interface MyIssuesSectionProps {
  id: string;
  title: string;
  issues: NormalizedIssue[];
  defaultOpen?: boolean;
  droppable?: boolean;
  onIssueClick: (issue: NormalizedIssue) => void;
}

export function MyIssuesSection({
  id,
  title,
  issues,
  defaultOpen = true,
  droppable = false,
  onIssueClick,
}: MyIssuesSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !droppable });

  const issueIds = issues.map((i) => `${i.repo.fullName}:${i.number}`);

  return (
    <div>
      <button
        className="flex w-full items-center gap-2 py-2 text-left"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">({issues.length})</span>
      </button>
      {open && (
        <div
          ref={droppable ? setNodeRef : undefined}
          className={cn(
            "ml-1 min-h-[40px] rounded-md transition-colors",
            isOver && "bg-accent/50 ring-2 ring-primary/20"
          )}
        >
          <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
            {issues.length === 0 ? (
              <p className={cn(
                "px-3 py-4 text-sm text-muted-foreground",
                isOver && "text-primary"
              )}>
                {isOver ? "Drop here" : "No issues in this section."}
              </p>
            ) : (
              issues.map((issue) => (
                <MyIssueRow
                  key={issue.id}
                  issue={issue}
                  onClick={() => onIssueClick(issue)}
                  draggable={droppable}
                />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

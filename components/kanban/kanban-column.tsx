"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PanelLeftClose, ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils";
import type { NormalizedIssue } from "@/types/github";
import type { SortField, SortDirection } from "./kanban-board";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  issues: NormalizedIssue[];
  onIssueClick: (issue: NormalizedIssue) => void;
  onCollapse?: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  onDirectionToggle: () => void;
  timeField?: string;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "priority", label: "Pri" },
  { value: "repo", label: "Repo" },
  { value: "effort", label: "Eff" },
  { value: "wsjf", label: "WSJF" },
  { value: "time", label: "Time" },
];

export function KanbanColumn({
  id,
  title,
  color,
  issues,
  onIssueClick,
  onCollapse,
  sortField,
  sortDirection,
  onSortChange,
  onDirectionToggle,
  timeField,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const issueIds = issues.map((i) => `${i.repo.fullName}:${i.number}`);

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-1 flex items-center gap-2 px-1">
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
      <div className="mb-2 flex items-center gap-1 px-1">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={sortField}
          onValueChange={(v) => v && onSortChange(v as SortField)}
        >
          {SORT_OPTIONS.map((opt) => (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              className="h-6 px-1.5 text-[10px]"
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button
          variant="outline"
          size="icon"
          className="size-6"
          onClick={onDirectionToggle}
        >
          {sortDirection === "desc" ? (
            <ArrowDownNarrowWide className="size-3" />
          ) : (
            <ArrowUpNarrowWide className="size-3" />
          )}
        </Button>
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
                showTime={sortField === "time"}
                timeField={timeField}
                emphasizeWsjf={sortField === "wsjf"}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

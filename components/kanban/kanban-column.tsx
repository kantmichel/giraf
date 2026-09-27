"use client";

import { useDroppable } from "@dnd-kit/core";
import { PanelLeftClose, ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils";
import type { ScoredIssue } from "@/lib/wsjf";
import type { ColumnSort, SortField, SortDirection } from "./kanban-board";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  issues: ScoredIssue[];
  onIssueClick: (issue: ScoredIssue) => void;
  onCollapse?: () => void;
  sort: ColumnSort;
  onSortChange: (sort: ColumnSort) => void;
  timeField?: string;
}

const SORT_LABELS: Record<SortField, string> = {
  priority: "Priority",
  repo: "Repo",
  effort: "Effort",
  wsjf: "WSJF",
  time: "Time",
  age: "Age",
};

const SORT_FIELDS = Object.keys(SORT_LABELS) as SortField[];

// "Time" means a different date per column; name the one it actually sorts by.
const TIME_LABELS: Record<string, string> = {
  createdAt: "Created",
  updatedAt: "Updated",
  closedAt: "Closed",
};

function sortLabel(field: SortField, timeField?: string): string {
  if (field === "time" && timeField) return TIME_LABELS[timeField] ?? SORT_LABELS.time;
  return SORT_LABELS[field];
}

export function KanbanColumn({
  id,
  title,
  color,
  issues,
  onIssueClick,
  onCollapse,
  sort,
  onSortChange,
  timeField,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const DirectionIcon = sort.direction === "desc" ? ArrowDownNarrowWide : ArrowUpNarrowWide;

  return (
    // Fills the board when there is room, never squeezes a card below 256px —
    // past that the board scrolls sideways instead.
    <div className="flex max-w-sm min-w-64 flex-1 flex-col">
      <div className="mb-2 flex h-7 items-center gap-2 px-1">
        <div
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: `#${color}` }}
        />
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{issues.length}</span>
        <div className="ml-auto flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-xs font-normal text-muted-foreground"
                aria-label={`Sort ${title}`}
              >
                <DirectionIcon className="size-3.5" />
                {sortLabel(sort.field, timeField)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sort.field}
                // A new field starts descending — most important, highest or
                // newest first — rather than inheriting the old direction.
                onValueChange={(v) => onSortChange({ field: v as SortField, direction: "desc" })}
              >
                {SORT_FIELDS.map((field) => (
                  <DropdownMenuRadioItem key={field} value={field}>
                    {sortLabel(field, timeField)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sort.direction}
                onValueChange={(v) => onSortChange({ ...sort, direction: v as SortDirection })}
              >
                <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={onCollapse}
              aria-label={`Collapse ${title}`}
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-dashed p-2 transition-colors",
          isOver
            ? "border-primary/50 bg-accent/50"
            : "border-transparent bg-muted/30"
        )}
      >
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
              showTime={sort.field === "time"}
              timeField={timeField}
              emphasizeWsjf={sort.field === "wsjf"}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface KanbanColumnRailProps {
  id: string;
  title: string;
  color: string;
  count: number;
  onExpand: () => void;
}

/**
 * A column folded into a thin full-height strip. It registers the same
 * droppable id as the column it replaces, so dropping a card here does exactly
 * what dropping it on the expanded column would.
 */
export function KanbanColumnRail({ id, title, color, count, onExpand }: KanbanColumnRailProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <button
      ref={setNodeRef}
      onClick={onExpand}
      aria-label={`Expand ${title} (${count})`}
      className={cn(
        "flex w-9 shrink-0 flex-col items-center gap-2 rounded-lg border border-dashed py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
        isOver ? "border-primary/50 bg-accent/50" : "border-transparent bg-muted/30"
      )}
    >
      <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `#${color}` }} />
      <span className="font-medium" style={{ writingMode: "vertical-lr" }}>
        {title} <span className="tabular-nums">({count})</span>
      </span>
    </button>
  );
}

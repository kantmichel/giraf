"use client";

import { useState, useMemo, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { STATUS_LABELS } from "@/lib/constants";
import type { NormalizedIssue } from "@/types/github";

export type SortField = "priority" | "repo" | "effort" | "time";
export type SortDirection = "asc" | "desc";
export interface ColumnSort { field: SortField; direction: SortDirection }

const COLUMNS = [
  { id: "to do", label: "To Do", color: STATUS_LABELS[0].color },
  { id: "doing", label: "Doing", color: STATUS_LABELS[1].color },
  { id: "in review", label: "In Review", color: STATUS_LABELS[2].color },
  { id: "done", label: "Done", color: STATUS_LABELS[3].color },
];

const DEFAULT_SORT: ColumnSort = { field: "priority", direction: "desc" };

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const EFFORT_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const TIME_FIELD_MAP: Record<string, keyof NormalizedIssue> = {
  "to do": "createdAt",
  "doing": "updatedAt",
  "in review": "updatedAt",
  "done": "closedAt",
  "unset": "createdAt",
};

function getTimeValue(issue: NormalizedIssue, columnId: string): number {
  const field = TIME_FIELD_MAP[columnId] || "updatedAt";
  const val = issue[field] as string | null;
  return val ? new Date(val).getTime() : 0;
}

function createComparator(sort: ColumnSort, columnId: string) {
  return (a: NormalizedIssue, b: NormalizedIssue): number => {
    let result = 0;

    switch (sort.field) {
      case "priority": {
        const pa = a.priority ? (PRIORITY_RANK[a.priority] ?? 99) : 99;
        const pb = b.priority ? (PRIORITY_RANK[b.priority] ?? 99) : 99;
        result = pa - pb;
        break;
      }
      case "repo":
        result = a.repo.fullName.localeCompare(b.repo.fullName);
        break;
      case "effort": {
        const ea = a.effort ? (EFFORT_RANK[a.effort] ?? 99) : 99;
        const eb = b.effort ? (EFFORT_RANK[b.effort] ?? 99) : 99;
        result = ea - eb;
        break;
      }
      case "time":
        result = getTimeValue(a, columnId) - getTimeValue(b, columnId);
        break;
    }

    // Apply direction (default comparator is asc; desc flips)
    if (sort.direction === "desc") result = -result;

    // Tiebreaker: time desc
    if (result === 0) {
      result = getTimeValue(b, columnId) - getTimeValue(a, columnId);
    }

    return result;
  };
}

interface KanbanBoardProps {
  issues: NormalizedIssue[];
  isLoading: boolean;
  onIssueClick: (issue: NormalizedIssue) => void;
  initialSorts?: Record<string, ColumnSort>;
  onSortsChange?: (sorts: Record<string, ColumnSort>) => void;
}

export function KanbanBoard({ issues, isLoading, onIssueClick, initialSorts, onSortsChange }: KanbanBoardProps) {
  const updateIssue = useUpdateIssue();
  const [activeIssue, setActiveIssue] = useState<NormalizedIssue | null>(null);
  const [unsetCollapsed, setUnsetCollapsed] = useState(false);
  const [columnSorts, setColumnSorts] = useState<Record<string, ColumnSort>>(initialSorts ?? {});

  const getSort = useCallback((columnId: string): ColumnSort => {
    return columnSorts[columnId] || DEFAULT_SORT;
  }, [columnSorts]);

  const handleSortChange = useCallback((columnId: string, field: SortField) => {
    setColumnSorts((prev) => {
      const current = prev[columnId] || DEFAULT_SORT;
      const next = current.field === field
        ? { ...prev, [columnId]: { field, direction: current.direction === "desc" ? "asc" as const : "desc" as const } }
        : { ...prev, [columnId]: { field, direction: "desc" as const } };
      onSortsChange?.(next);
      return next;
    });
  }, [onSortsChange]);

  const handleDirectionToggle = useCallback((columnId: string) => {
    setColumnSorts((prev) => {
      const current = prev[columnId] || DEFAULT_SORT;
      const next = { ...prev, [columnId]: { ...current, direction: current.direction === "desc" ? "asc" as const : "desc" as const } };
      onSortsChange?.(next);
      return next;
    });
  }, [onSortsChange]);

  const grouped = useMemo(() => {
    const groups: Record<string, NormalizedIssue[]> = {};
    for (const col of COLUMNS) {
      groups[col.id] = [];
    }
    groups["unset"] = [];

    for (const issue of issues) {
      const status = issue.status;
      if (status && groups[status]) {
        groups[status].push(issue);
      } else {
        groups["unset"].push(issue);
      }
    }

    for (const key of Object.keys(groups)) {
      const sort = columnSorts[key] || DEFAULT_SORT;
      groups[key].sort(createComparator(sort, key));
    }

    return groups;
  }, [issues, columnSorts]);

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const targetStatus = over.id as string;
    const issue = active.data.current?.issue as NormalizedIssue | undefined;
    if (!issue) return;

    // Don't update if same column
    if (issue.status === targetStatus) return;
    if (!issue.status && targetStatus === "unset") return;

    // Build new labels
    const otherLabels = issue.labels
      .map((l) => l.name)
      .filter((n) => !n.startsWith("status: "));

    const newLabels =
      targetStatus === "unset"
        ? otherLabels
        : [...otherLabels, `status: ${targetStatus}`];

    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels: newLabels },
    });
  }

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-1 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const hasUnset = grouped["unset"].length > 0;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={(event) => {
        setActiveIssue(event.active.data.current?.issue || null);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {hasUnset && (
          unsetCollapsed ? (
            <button
              className="flex h-fit shrink-0 items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-3 text-xs text-muted-foreground hover:bg-muted/50"
              style={{ writingMode: "vertical-lr" }}
              onClick={() => setUnsetCollapsed(false)}
            >
              <div className="size-2 rounded-full" style={{ backgroundColor: "#666666" }} />
              Unset ({grouped["unset"].length})
            </button>
          ) : (
            <KanbanColumn
              id="unset"
              title="Unset"
              color="666666"
              issues={grouped["unset"]}
              onIssueClick={onIssueClick}
              onCollapse={() => setUnsetCollapsed(true)}
              sortField={getSort("unset").field}
              sortDirection={getSort("unset").direction}
              onSortChange={(field) => handleSortChange("unset", field)}
              onDirectionToggle={() => handleDirectionToggle("unset")}
              timeField={TIME_FIELD_MAP["unset"]}
            />
          )
        )}
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.label}
            color={col.color}
            issues={grouped[col.id]}
            onIssueClick={onIssueClick}
            sortField={getSort(col.id).field}
            sortDirection={getSort(col.id).direction}
            onSortChange={(field) => handleSortChange(col.id, field)}
            onDirectionToggle={() => handleDirectionToggle(col.id)}
            timeField={TIME_FIELD_MAP[col.id]}
          />
        ))}
      </div>
      <DragOverlay>
        {activeIssue && (
          <div className="w-[250px] rounded-md border bg-card p-3 shadow-lg">
            <p className="line-clamp-2 text-sm font-medium">{activeIssue.title}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">#{activeIssue.number}</span>
              <IssueRepoBadge repo={activeIssue.repo.fullName} />
              <IssuePriorityBadge priority={activeIssue.priority} />
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { KanbanColumn, KanbanColumnRail } from "./kanban-column";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { STATUS_LABELS } from "@/lib/constants";
import type { ScoredIssue } from "@/lib/wsjf";
import type { NormalizedIssue } from "@/types/github";

export type SortField = "priority" | "repo" | "effort" | "wsjf" | "time" | "age";
export type SortDirection = "asc" | "desc";
export interface ColumnSort { field: SortField; direction: SortDirection }

const COLUMNS = [
  { id: "to do", label: "To Do", color: STATUS_LABELS[0].color },
  { id: "doing", label: "Doing", color: STATUS_LABELS[1].color },
  { id: "in review", label: "In Review", color: STATUS_LABELS[2].color },
  { id: "done", label: "Done", color: STATUS_LABELS[3].color },
];

const DEFAULT_SORT: ColumnSort = { field: "priority", direction: "desc" };

const PRIORITY_RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const EFFORT_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };

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
  return (a: ScoredIssue, b: ScoredIssue): number => {
    let result = 0;

    switch (sort.field) {
      case "priority": {
        const pa = a.priority ? (PRIORITY_RANK[a.priority] ?? -1) : -1;
        const pb = b.priority ? (PRIORITY_RANK[b.priority] ?? -1) : -1;
        result = pa - pb;
        break;
      }
      case "repo":
        result = a.repo.fullName.localeCompare(b.repo.fullName);
        break;
      case "effort": {
        const ea = a.effort ? (EFFORT_RANK[a.effort] ?? -1) : -1;
        const eb = b.effort ? (EFFORT_RANK[b.effort] ?? -1) : -1;
        result = ea - eb;
        break;
      }
      case "wsjf": {
        // Match the existing pattern: unset sorts as -1 so it lands at the
        // bottom of desc and the top of asc, consistent with priority/effort.
        const wa = a.wsjf.score ?? -1;
        const wb = b.wsjf.score ?? -1;
        result = wa - wb;
        break;
      }
      case "time":
        result = getTimeValue(a, columnId) - getTimeValue(b, columnId);
        break;
      case "age":
        // Ascending by age (= descending by createdAt), so the default
        // "desc" direction puts the oldest issues at the top of the column.
        result = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
  issues: ScoredIssue[];
  isLoading: boolean;
  onIssueClick: (issue: ScoredIssue) => void;
  initialSorts?: Record<string, ColumnSort>;
  onSortsChange?: (sorts: Record<string, ColumnSort>) => void;
}

export function KanbanBoard({ issues, isLoading, onIssueClick, initialSorts, onSortsChange }: KanbanBoardProps) {
  const updateIssue = useUpdateIssue();
  const [activeIssue, setActiveIssue] = useState<ScoredIssue | null>(null);
  // Unset issues are waiting for triage, not work in progress: start folded
  // so the board opens on the columns you actually move work through.
  const [unsetCollapsed, setUnsetCollapsed] = useState(true);
  const [columnSorts, setColumnSorts] = useState<Record<string, ColumnSort>>(initialSorts ?? {});

  const getSort = useCallback((columnId: string): ColumnSort => {
    return columnSorts[columnId] || DEFAULT_SORT;
  }, [columnSorts]);

  // Saved outside the state updater: React may run an updater twice, and a
  // network write inside one would then fire twice.
  function setSort(columnId: string, sort: ColumnSort) {
    const next = { ...columnSorts, [columnId]: sort };
    setColumnSorts(next);
    onSortsChange?.(next);
  }

  const grouped = useMemo(() => {
    const groups: Record<string, ScoredIssue[]> = {};
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
    const issue = active.data.current?.issue as ScoredIssue | undefined;
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
      <div className="flex min-h-0 flex-1 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className="max-w-sm min-w-64 flex-1 space-y-2">
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
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
        {hasUnset && (
          unsetCollapsed ? (
            <KanbanColumnRail
              id="unset"
              title="Unset"
              color="666666"
              count={grouped["unset"].length}
              onExpand={() => setUnsetCollapsed(false)}
            />
          ) : (
            <KanbanColumn
              id="unset"
              title="Unset"
              color="666666"
              issues={grouped["unset"]}
              onIssueClick={onIssueClick}
              onCollapse={() => setUnsetCollapsed(true)}
              sort={getSort("unset")}
              onSortChange={(sort) => setSort("unset", sort)}
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
            sort={getSort(col.id)}
            onSortChange={(sort) => setSort(col.id, sort)}
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

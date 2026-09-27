"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn, KanbanColumnRail } from "./kanban-column";
import { KanbanCardPreview, kanbanCardId, type KanbanDragData } from "./kanban-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import {
  KANBAN_COLUMNS,
  UNSET_COLUMN,
  TIME_FIELD,
  columnSort,
  type ColumnSort,
  type KanbanSorts,
} from "@/lib/kanban";
import type { ScoredIssue } from "@/lib/wsjf";
import type { NormalizedIssue } from "@/types/github";

// The only valid drop targets. A drop anywhere else is ignored, never written.
const COLUMN_IDS = new Set<string>([...KANBAN_COLUMNS.map((c) => c.id), UNSET_COLUMN.id]);

/** The column an issue sits in. Anything without a known status is Unset. */
function columnIdOf(issue: ScoredIssue): string {
  return issue.status && COLUMN_IDS.has(issue.status) ? issue.status : UNSET_COLUMN.id;
}

/** A dropped card shown in its new column before the cache says so. */
interface PendingMove {
  cardId: string;
  columnId: string;
  /** The issues it was made against — it applies only while they are current. */
  issues: ScoredIssue[];
}

const PRIORITY_RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const EFFORT_RANK: Record<string, number> = { high: 2, medium: 1, low: 0 };

function getTimeValue(issue: NormalizedIssue, columnId: string): number {
  const val = issue[TIME_FIELD[columnId] ?? "updatedAt"];
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
  /** Saved per-column sorts. Read on every render, never copied: a copy taken
   *  before preferences loaded used to hide the saved sorts, and the next
   *  change then saved that one column over all the others. */
  sorts: KanbanSorts | null;
  onSortsChange: (sorts: KanbanSorts) => void;
}

export function KanbanBoard({ issues, isLoading, onIssueClick, sorts, onSortsChange }: KanbanBoardProps) {
  const updateIssue = useUpdateIssue();
  const [activeDrag, setActiveDrag] = useState<KanbanDragData | null>(null);
  // The whole card is the handle, so a drag only starts after a deliberate
  // 6px move — a plain click still opens the issue.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  // Unset issues are waiting for triage, not work in progress: start folded
  // so the board opens on the columns you actually move work through.
  const [unsetCollapsed, setUnsetCollapsed] = useState(true);
  // The optimistic cache update lands a few ticks after the drop (it awaits
  // query cancellation first), and the drop animation flies the card to
  // wherever it sits by then — its old column. Moving it in the same render as
  // the drop lets it land in its new slot. Keyed to the issues it was made
  // against, it lapses by itself once the cache catches up or rolls back.
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  function setSort(columnId: string, sort: ColumnSort) {
    onSortsChange({ ...sorts, [columnId]: sort });
  }

  const grouped = useMemo(() => {
    const groups: Record<string, ScoredIssue[]> = {};
    for (const col of KANBAN_COLUMNS) {
      groups[col.id] = [];
    }
    groups[UNSET_COLUMN.id] = [];

    const move = pendingMove?.issues === issues ? pendingMove : null;
    for (const issue of issues) {
      const columnId =
        move && move.cardId === kanbanCardId(issue) ? move.columnId : columnIdOf(issue);
      groups[columnId].push(issue);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort(createComparator(columnSort(sorts, key), key));
    }

    return groups;
  }, [issues, sorts, pendingMove]);

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const targetStatus = String(over.id);
    if (!COLUMN_IDS.has(targetStatus)) return;
    const issue = active.data.current?.issue as ScoredIssue | undefined;
    if (!issue) return;
    if (columnIdOf(issue) === targetStatus) return;

    setPendingMove({ cardId: kanbanCardId(issue), columnId: targetStatus, issues });

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
        {KANBAN_COLUMNS.map((col) => (
          <div key={col.id} className="max-w-sm min-w-64 flex-1 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const unsetIssues = grouped[UNSET_COLUMN.id];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press Enter to open this issue. Drag it to another column to change its status.",
        },
      }}
      onDragStart={(event) => {
        setActiveDrag((event.active.data.current as KanbanDragData | undefined) ?? null);
      }}
      onDragCancel={() => setActiveDrag(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
        {unsetIssues.length > 0 && (
          unsetCollapsed ? (
            <KanbanColumnRail
              id={UNSET_COLUMN.id}
              title={UNSET_COLUMN.label}
              color={UNSET_COLUMN.color}
              count={unsetIssues.length}
              onExpand={() => setUnsetCollapsed(false)}
            />
          ) : (
            <KanbanColumn
              id={UNSET_COLUMN.id}
              title={UNSET_COLUMN.label}
              color={UNSET_COLUMN.color}
              issues={unsetIssues}
              onIssueClick={onIssueClick}
              onCollapse={() => setUnsetCollapsed(true)}
              sort={columnSort(sorts, UNSET_COLUMN.id)}
              onSortChange={(sort) => setSort(UNSET_COLUMN.id, sort)}
            />
          )
        )}
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.label}
            color={col.color}
            issues={grouped[col.id]}
            onIssueClick={onIssueClick}
            sort={columnSort(sorts, col.id)}
            onSortChange={(sort) => setSort(col.id, sort)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDrag && <KanbanCardPreview {...activeDrag} />}
      </DragOverlay>
    </DndContext>
  );
}

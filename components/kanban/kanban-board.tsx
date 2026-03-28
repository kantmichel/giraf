"use client";

import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { STATUS_LABELS } from "@/lib/constants";
import type { NormalizedIssue } from "@/types/github";

const COLUMNS = [
  { id: "to do", label: "To Do", color: STATUS_LABELS[0].color },
  { id: "doing", label: "Doing", color: STATUS_LABELS[1].color },
  { id: "in review", label: "In Review", color: STATUS_LABELS[2].color },
  { id: "done", label: "Done", color: STATUS_LABELS[3].color },
];

interface KanbanBoardProps {
  issues: NormalizedIssue[];
  isLoading: boolean;
  onIssueClick: (issue: NormalizedIssue) => void;
}

export function KanbanBoard({ issues, isLoading, onIssueClick }: KanbanBoardProps) {
  const updateIssue = useUpdateIssue();
  const [activeIssue, setActiveIssue] = useState<NormalizedIssue | null>(null);
  const [unsetCollapsed, setUnsetCollapsed] = useState(false);

  const grouped = useMemo(() => {
    const priorityRank: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    const sortByPriority = (a: NormalizedIssue, b: NormalizedIssue) => {
      const pa = a.priority ? (priorityRank[a.priority] ?? 99) : 99;
      const pb = b.priority ? (priorityRank[b.priority] ?? 99) : 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    };

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
      groups[key].sort(sortByPriority);
    }

    return groups;
  }, [issues]);

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

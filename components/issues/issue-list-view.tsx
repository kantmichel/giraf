"use client";

import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { IssueListSection } from "./issue-list-section";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import type { IssueSortDir } from "@/hooks/use-filter-state";
import type { NormalizedIssue } from "@/types/github";

const SECTION_STATUS_MAP: Record<string, string> = {
  active: "status: doing",
  upNext: "status: to do",
};

interface IssueListViewProps {
  issues: NormalizedIssue[];
  isLoading: boolean;
  onIssueClick: (issue: NormalizedIssue) => void;
  /** Date ordering — Active and Up Next arrive pre-sorted; Done follows it too. */
  sortDir?: IssueSortDir;
}

export function IssueListView({ issues, isLoading, onIssueClick, sortDir = "newest" }: IssueListViewProps) {
  const updateIssue = useUpdateIssue();
  const [activeIssue, setActiveIssue] = useState<NormalizedIssue | null>(null);

  const { active, upNext, done } = useMemo(() => {
    const active: NormalizedIssue[] = [];
    const upNext: NormalizedIssue[] = [];
    const done: NormalizedIssue[] = [];

    for (const issue of issues) {
      if (issue.status === "doing" || issue.status === "in review") {
        active.push(issue);
      } else if (issue.status === "done" || issue.state === "closed") {
        done.push(issue);
      } else {
        upNext.push(issue);
      }
    }

    // Sort done by closedAt, following the chosen direction
    const dir = sortDir === "oldest" ? 1 : -1;
    done.sort(
      (a, b) =>
        (new Date(a.closedAt || a.updatedAt).getTime() -
          new Date(b.closedAt || b.updatedAt).getTime()) * dir
    );

    return { active, upNext, done };
  }, [issues, sortDir]);

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const targetSection = over.id as string;
    const newStatusLabel = SECTION_STATUS_MAP[targetSection];
    if (!newStatusLabel) return;

    const issue = active.data.current?.issue as NormalizedIssue | undefined;
    if (!issue) return;

    const currentStatusLabel = issue.status ? `status: ${issue.status}` : null;
    if (currentStatusLabel === newStatusLabel) return;

    const otherLabels = issue.labels
      .map((l) => l.name)
      .filter((n) => !n.startsWith("status: "));

    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels: [...otherLabels, newStatusLabel] },
    });
  }

  if (isLoading) return null;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={(event) => {
        setActiveIssue(event.active.data.current?.issue || null);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-2">
        <IssueListSection
          id="active"
          title="Active"
          issues={active}
          droppable
          onIssueClick={onIssueClick}
        />
        <IssueListSection
          id="upNext"
          title="Up Next"
          issues={upNext}
          droppable
          onIssueClick={onIssueClick}
        />
        {done.length > 0 && (
          <IssueListSection
            id="done"
            title="Done"
            issues={done}
            defaultOpen={false}
            onIssueClick={onIssueClick}
          />
        )}
      </div>
      <DragOverlay>
        {activeIssue && (
          <div className="rounded-md border bg-popover px-3 py-2 shadow-lg">
            <span className="text-sm font-medium">{activeIssue.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MyIssuesSection } from "@/components/my-issues/my-issues-section";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { useMyIssues } from "@/hooks/use-my-issues";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import type { NormalizedIssue } from "@/types/github";

const SECTION_STATUS_MAP: Record<string, string> = {
  active: "status: doing",
  upNext: "status: to do",
};

export default function MyIssuesPage() {
  const { data, isLoading, isError, refetch } = useMyIssues();
  const updateIssue = useUpdateIssue();
  const [selectedIssue, setSelectedIssue] = useState<NormalizedIssue | null>(null);
  const [activeIssue, setActiveIssue] = useState<NormalizedIssue | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Failed to load your issues</p>
        <Button size="sm" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const targetSection = over.id as string;
    const newStatusLabel = SECTION_STATUS_MAP[targetSection];
    if (!newStatusLabel) return;

    const issue = active.data.current?.issue as NormalizedIssue | undefined;
    if (!issue) return;

    // Don't update if already in this section
    const currentStatusLabel = issue.status ? `status: ${issue.status}` : null;
    if (currentStatusLabel === newStatusLabel) return;

    // Build new labels: remove old status, add new one
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

  return (
    <>
      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={(event) => {
          const issue = event.active.data.current?.issue as NormalizedIssue;
          setActiveIssue(issue || null);
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2">
          <MyIssuesSection
            id="active"
            title="Active"
            issues={data?.active ?? []}
            droppable
            onIssueClick={setSelectedIssue}
          />
          <MyIssuesSection
            id="upNext"
            title="Up Next"
            issues={data?.upNext ?? []}
            droppable
            onIssueClick={setSelectedIssue}
          />
          <MyIssuesSection
            id="recentlyCompleted"
            title="Recently Completed"
            issues={data?.recentlyCompleted ?? []}
            defaultOpen={false}
            onIssueClick={setSelectedIssue}
          />
          <MyIssuesSection
            id="snoozed"
            title="Snoozed"
            issues={data?.snoozed ?? []}
            defaultOpen={false}
            onIssueClick={setSelectedIssue}
          />
        </div>
        <DragOverlay>
          {activeIssue && (
            <div className="rounded-md border bg-popover px-3 py-2 shadow-lg">
              <span className="text-sm font-medium">{activeIssue.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <IssueDetailSidebar
        issue={selectedIssue}
        open={selectedIssue !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}

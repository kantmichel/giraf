"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSwitcher } from "@/components/filters/view-switcher";
import { MyIssuesSection } from "@/components/my-issues/my-issues-section";
import { KanbanBoard } from "@/components/kanban/kanban-board";
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

  // Sync selectedIssue with cache updates
  useEffect(() => {
    if (!selectedIssue || !data) return;
    const allIssues = [...data.active, ...data.upNext, ...data.recentlyCompleted, ...data.snoozed];
    const updated = allIssues.find((i) => i.id === selectedIssue.id);
    if (updated) setSelectedIssue(updated);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const view = (searchParams.get("view") as "table" | "kanban") || "table";

  function setView(v: "table" | "kanban") {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "table") params.delete("view");
    else params.set("view", v);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Combine all open issues for kanban view
  const allMyIssues = useMemo(() => {
    if (!data) return [];
    return [...data.active, ...data.upNext, ...data.snoozed];
  }, [data]);

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

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {allMyIssues.length} issue{allMyIssues.length !== 1 ? "s" : ""} assigned to you
        </h2>
        <ViewSwitcher view={view} onViewChange={setView} />
      </div>

      {view === "kanban" ? (
        <KanbanBoard
          issues={allMyIssues}
          isLoading={false}
          onIssueClick={setSelectedIssue}
        />
      ) : (
        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={(event) => {
            setActiveIssue(event.active.data.current?.issue || null);
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
      )}

      <IssueDetailSidebar
        issue={selectedIssue}
        open={selectedIssue !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}

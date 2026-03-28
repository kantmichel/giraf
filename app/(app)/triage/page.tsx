"use client";

import { useState, useMemo } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ViewSwitcher } from "@/components/filters/view-switcher";
import { TriageIssueCard } from "@/components/triage/triage-issue-card";
import { TriageTable } from "@/components/triage/triage-table";
import { TriageBulkActions } from "@/components/triage/triage-bulk-actions";
import { PriorityReview } from "@/components/triage/priority-review";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { useTriageIssues, useTriageAction } from "@/hooks/use-triage";
import type { NormalizedIssue } from "@/types/github";

export default function TriagePage() {
  const { data, isLoading, isError, refetch } = useTriageIssues();
  const triageAction = useTriageAction();
  const [selectedIssue, setSelectedIssue] = useState<NormalizedIssue | null>(null);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedIssues = useMemo(() => {
    if (!data?.issues) return [];
    return data.issues.filter(
      (i) => selectedIds.has(`${i.repo.fullName}:${i.number}`)
    );
  }, [data?.issues, selectedIds]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Failed to load triage</p>
        <Button size="sm" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.issues.length) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <CheckCircle className="size-10 text-green-500" />
          <p className="mt-3 text-lg font-medium">All caught up!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No issues to triage right now.
          </p>
        </div>
        <Separator className="my-8" />
        <PriorityReview />
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Triage Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {data.count} issue{data.count !== 1 ? "s" : ""} to review
            </p>
          </div>
          <ViewSwitcher
            view={view}
            onViewChange={(v) => {
              setView(v);
              setSelectedIds(new Set());
            }}
          />
        </div>

        {/* Bulk actions toolbar */}
        {view === "table" && selectedIssues.length > 0 && (
          <TriageBulkActions
            selectedIssues={selectedIssues}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}

        {view === "table" ? (
          <TriageTable
            issues={data.issues}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onIssueClick={setSelectedIssue}
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {data.issues.map((issue) => (
              <TriageIssueCard
                key={issue.id}
                issue={issue}
                onAccept={(priority, assignees) =>
                  triageAction.mutate({
                    owner: issue.repo.owner,
                    repo: issue.repo.name,
                    number: issue.number,
                    action: "accept",
                    priority,
                    assignees,
                  })
                }
                onDecline={() =>
                  triageAction.mutate({
                    owner: issue.repo.owner,
                    repo: issue.repo.name,
                    number: issue.number,
                    action: "decline",
                  })
                }
                onSnooze={(until, wakeOnActivity) =>
                  triageAction.mutate({
                    owner: issue.repo.owner,
                    repo: issue.repo.name,
                    number: issue.number,
                    action: "snooze",
                    snoozedUntil: until || undefined,
                    wakeOnActivity,
                  })
                }
                onTitleClick={() => setSelectedIssue(issue)}
                disabled={triageAction.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <Separator className="my-8" />
      <PriorityReview />

      <IssueDetailSidebar
        issue={selectedIssue}
        open={selectedIssue !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}

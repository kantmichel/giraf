"use client";

import { useState, useMemo } from "react";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ViewSwitcher } from "@/components/filters/view-switcher";
import { FilterMultiSelect } from "@/components/filters/filter-multi-select";
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
  const [reviewOpen, setReviewOpen] = useState(true);
  const [repoFilter, setRepoFilter] = useState<string[]>([]);

  const filteredIssues = useMemo(() => {
    if (!data?.issues) return [];
    if (repoFilter.length === 0) return data.issues;
    return data.issues.filter((i) => repoFilter.includes(i.repo.fullName));
  }, [data?.issues, repoFilter]);

  const repoOptions = useMemo(() => {
    if (!data?.issues) return [];
    const repos = new Set(data.issues.map((i) => i.repo.fullName));
    return [...repos].sort().map((r) => ({
      value: r,
      label: r.includes("/") ? r.split("/")[1] : r,
    }));
  }, [data?.issues]);

  const selectedIssues = useMemo(() => {
    return filteredIssues.filter(
      (i) => selectedIds.has(`${i.repo.fullName}:${i.number}`)
    );
  }, [filteredIssues, selectedIds]);

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

  const reviewSection = (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={() => setReviewOpen(!reviewOpen)}
      >
        {reviewOpen ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">Weekly Priority Review</span>
      </button>
      {reviewOpen && (
        <div className="border-t px-4 py-4">
          <PriorityReview />
        </div>
      )}
    </div>
  );

  if (!data?.issues.length) {
    return (
      <div className="space-y-6">
        {reviewSection}
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <CheckCircle className="size-10 text-green-500" />
          <p className="mt-3 text-lg font-medium">All caught up!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No issues to triage right now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reviewSection}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Triage Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {filteredIssues.length} of {data.count} issue{data.count !== 1 ? "s" : ""} to review
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FilterMultiSelect
              title="Repo"
              options={repoOptions}
              selected={repoFilter}
              onSelectionChange={setRepoFilter}
            />
            <ViewSwitcher
              view={view}
              onViewChange={(v) => {
                setView(v);
                setSelectedIds(new Set());
              }}
            />
          </div>
        </div>

        {view === "table" && selectedIssues.length > 0 && (
          <TriageBulkActions
            selectedIssues={selectedIssues}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}

        {view === "table" ? (
          <TriageTable
            issues={filteredIssues}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onIssueClick={setSelectedIssue}
          />
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {filteredIssues.map((issue) => (
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

      <IssueDetailSidebar
        issue={selectedIssue}
        open={selectedIssue !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}

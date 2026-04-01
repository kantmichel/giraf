"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { GitFork, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/filters/filter-bar";
import { ViewSwitcher } from "@/components/filters/view-switcher";
import { IssueTable } from "@/components/issues/issue-table";
import { IssueBulkActions } from "@/components/issues/issue-bulk-actions";
import { IssueListView } from "@/components/issues/issue-list-view";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { MetricsMiniRow } from "@/components/metrics/metrics-mini-row";
import { useIssues } from "@/hooks/use-issues";
import { useTrackedRepos } from "@/hooks/use-tracked-repos";
import { useFilterState } from "@/hooks/use-filter-state";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import type { NormalizedIssue } from "@/types/github";

function IssuesContent() {
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const { filters, setFilters, clearFilters, hasActiveFilters, view, setView, weekOffset, setWeekOffset } = useFilterState(prefs?.preferred_view);
  const { data: trackedRepos, isLoading: reposLoading } = useTrackedRepos();
  const { issues, allIssues, isLoading: issuesLoading, isError, refetch } = useIssues(filters, weekOffset);
  const [selectedIssue, setSelectedIssue] = useState<NormalizedIssue | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedIssuesForBulk = useMemo(() => {
    return issues.filter((i) => selectedIds.has(`${i.repo.fullName}:${i.number}`));
  }, [issues, selectedIds]);

  // Sync selectedIssue with cache updates (optimistic updates)
  useEffect(() => {
    if (!selectedIssue) return;
    const updated = allIssues.find((i) => i.id === selectedIssue.id);
    if (updated) setSelectedIssue(updated);
  }, [allIssues]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Failed to load issues</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Check your connection and try again.
        </p>
        <Button size="sm" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!reposLoading && trackedRepos?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <GitFork className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No repositories tracked</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add repositories to start seeing issues.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/repos">Add Repositories</Link>
        </Button>
      </div>
    );
  }

  const loading = issuesLoading || reposLoading;

  return (
    <>
      <div className="space-y-4">
        <MetricsMiniRow issues={issues} allIssues={allIssues} />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              onClear={clearFilters}
              hasActiveFilters={hasActiveFilters}
              trackedRepos={trackedRepos ?? []}
              allIssues={allIssues}
              weekOffset={weekOffset}
              onWeekOffsetChange={setWeekOffset}
            />
          </div>
          <ViewSwitcher view={view} onViewChange={setView} />
        </div>
        {view === "table" && selectedIssuesForBulk.length > 0 && (
          <IssueBulkActions
            selectedIssues={selectedIssuesForBulk}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}
        {view === "list" ? (
          <IssueListView
            issues={issues}
            isLoading={loading}
            onIssueClick={setSelectedIssue}
          />
        ) : view === "table" ? (
          <IssueTable
            issues={issues}
            isLoading={loading}
            onIssueClick={setSelectedIssue}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            showClosedColumn={filters.state === "closed"}
          />
        ) : (
          <KanbanBoard
            issues={issues}
            isLoading={loading}
            onIssueClick={setSelectedIssue}
            initialSorts={prefs?.kanban_sort ?? undefined}
            onSortsChange={(sorts) => updatePrefs.mutate({ kanban_sort: sorts })}
          />
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

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <IssuesContent />
    </Suspense>
  );
}

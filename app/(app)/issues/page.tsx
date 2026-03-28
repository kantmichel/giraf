"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/filters/filter-bar";
import { IssueTable } from "@/components/issues/issue-table";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { useIssues } from "@/hooks/use-issues";
import { useTrackedRepos } from "@/hooks/use-tracked-repos";
import { useFilterState } from "@/hooks/use-filter-state";
import type { NormalizedIssue } from "@/types/github";

function IssuesContent() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useFilterState();
  const { data: trackedRepos, isLoading: reposLoading } = useTrackedRepos();
  const { issues, allIssues, isLoading: issuesLoading } = useIssues(filters);
  const [selectedIssue, setSelectedIssue] = useState<NormalizedIssue | null>(null);

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

  return (
    <>
      <div className="space-y-4">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
          trackedRepos={trackedRepos ?? []}
          allIssues={allIssues}
        />
        <IssueTable
          issues={issues}
          isLoading={issuesLoading || reposLoading}
          onIssueClick={setSelectedIssue}
        />
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

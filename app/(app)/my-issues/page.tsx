"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MyIssuesSection } from "@/components/my-issues/my-issues-section";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { useMyIssues } from "@/hooks/use-my-issues";
import type { NormalizedIssue } from "@/types/github";

export default function MyIssuesPage() {
  const { data, isLoading, isError, refetch } = useMyIssues();
  const [selectedIssue, setSelectedIssue] = useState<NormalizedIssue | null>(null);

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

  return (
    <>
      <div className="space-y-2">
        <MyIssuesSection
          title="Active"
          issues={data?.active ?? []}
          onIssueClick={setSelectedIssue}
        />
        <MyIssuesSection
          title="Up Next"
          issues={data?.upNext ?? []}
          onIssueClick={setSelectedIssue}
        />
        <MyIssuesSection
          title="Recently Completed"
          issues={data?.recentlyCompleted ?? []}
          defaultOpen={false}
          onIssueClick={setSelectedIssue}
        />
        <MyIssuesSection
          title="Snoozed"
          issues={data?.snoozed ?? []}
          defaultOpen={false}
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

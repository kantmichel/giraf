"use client";

import { useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TriageIssueCard } from "@/components/triage/triage-issue-card";
import { PriorityReview } from "@/components/triage/priority-review";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { useTriageIssues, useTriageAction } from "@/hooks/use-triage";
import type { NormalizedIssue } from "@/types/github";

export default function TriagePage() {
  const { data, isLoading, isError, refetch } = useTriageIssues();
  const triageAction = useTriageAction();
  const [selectedIssue, setSelectedIssue] = useState<NormalizedIssue | null>(null);

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
      <div className="mx-auto max-w-2xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.issues.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <CheckCircle className="size-10 text-green-500" />
        <p className="mt-3 text-lg font-medium">All caught up!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No issues to triage right now.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Triage Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {data.count} issue{data.count !== 1 ? "s" : ""} to review
            </p>
          </div>
        </div>
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

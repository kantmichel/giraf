"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { IssueStatusBadge } from "@/components/issues/issue-status-badge";
import { IssuePriorityEditor } from "@/components/issues/issue-priority-editor";
import { usePriorityReview, useUndoPromotion } from "@/hooks/use-priority-review";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import type { NormalizedIssue } from "@/types/github";
import { useIssues } from "@/hooks/use-issues";
import type { NormalizedUser } from "@/types/github";

function OverBudgetSection({
  priority,
  issues,
  max,
  over,
  onIssueClick,
}: {
  priority: string;
  issues: NormalizedIssue[];
  max: number;
  over: number;
  onIssueClick: (issue: NormalizedIssue) => void;
}) {
  const [open, setOpen] = useState(false);
  const updateIssue = useUpdateIssue();

  function handlePriorityChange(issue: NormalizedIssue, labels: string[]) {
    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels },
    });
  }

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <IssuePriorityBadge priority={priority} />
        <span>{issues.length} issues (budget: {max})</span>
        <span className="text-destructive">— {over} over</span>
      </button>
      {open && (
        <div className="border-t">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-accent/30">
                  <td className="max-w-0 truncate py-2 pl-3 pr-2">
                    <button
                      className="text-left hover:underline truncate block w-full"
                      onClick={() => onIssueClick(issue)}
                    >
                      {issue.title}
                    </button>
                  </td>
                  <td className="whitespace-nowrap py-2 px-2 text-xs text-muted-foreground w-12">#{issue.number}</td>
                  <td className="whitespace-nowrap py-2 px-2 w-20">
                    <IssueStatusBadge status={issue.status} />
                  </td>
                  <td className="whitespace-nowrap py-2 px-2 w-24" onClick={(e) => e.stopPropagation()}>
                    <IssuePriorityEditor
                      currentPriority={issue.priority}
                      allLabels={issue.labels.map((l) => l.name)}
                      onUpdate={(labels) => handlePriorityChange(issue, labels)}
                    />
                  </td>
                  <td className="whitespace-nowrap py-2 px-2 w-28"><IssueRepoBadge repo={issue.repo.fullName} /></td>
                  <td className="whitespace-nowrap py-2 pl-2 pr-3 text-right w-32"><RelativeTime date={issue.createdAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function PriorityReview({ onIssueClick }: { onIssueClick?: (issue: NormalizedIssue) => void }) {
  const { data: session } = useSession();
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], ai: [], hasPr: false, milestone: [], search: "" });
  const [selectedUser, setSelectedUser] = useState<string | undefined>(undefined);
  const user = selectedUser || session?.user?.githubUsername;
  const { data, isLoading } = usePriorityReview(user);
  const undoMutation = useUndoPromotion();

  // Get unique assignees
  const assignees = Array.from(
    new Map(
      allIssues.flatMap((i) => i.assignees).map((a) => [a.login, a])
    ).values()
  ).sort((a, b) => a.login.localeCompare(b.login));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const hasOverBudget = data.overBudget.critical.over > 0 || data.overBudget.high.over > 0 || data.overBudget.medium.over > 0;
  const hasPromotions = data.promotions.length > 0;
  const hasStale = data.staleIssues.length > 0;
  const allClear = !hasOverBudget && !hasPromotions && !hasStale;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Priority Review</h3>
          <p className="text-xs text-muted-foreground">
            Weekly priority health check
          </p>
        </div>
        <div className="flex gap-1">
          {assignees.map((a: NormalizedUser) => (
            <Button
              key={a.login}
              variant={user === a.login ? "default" : "outline"}
              size="sm"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setSelectedUser(a.login)}
            >
              <Avatar className="size-4">
                <AvatarImage src={a.avatarUrl} alt={a.login} />
                <AvatarFallback className="text-[7px]">{a.login[0]}</AvatarFallback>
              </Avatar>
              {a.login}
            </Button>
          ))}
        </div>
      </div>

      {allClear && (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <p className="text-sm font-medium text-green-600">All priorities look healthy</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No over-budget, no stale issues, no recent promotions.
          </p>
        </div>
      )}

      {/* Over budget */}
      {hasOverBudget && (
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-yellow-500" />
            Over Budget
          </h4>
          {(["critical", "high", "medium"] as const).map((priority) => {
            const bucket = data.overBudget[priority];
            if (bucket.over <= 0) return null;
            const max = priority === "critical" ? data.budget.critical_max
              : priority === "high" ? data.budget.high_max
              : data.budget.medium_max;
            return (
              <OverBudgetSection
                key={priority}
                priority={priority}
                issues={bucket.issues}
                max={max}
                over={bucket.over}
                onIssueClick={onIssueClick || (() => {})}
              />
            );
          })}
        </div>
      )}

      {/* Recent promotions */}
      {hasPromotions && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <ArrowUp className="size-4 text-blue-500" />
            Auto-promoted this week ({data.promotions.length})
          </h4>
          <div className="space-y-2">
            {data.promotions.map((p) => {
              const matchedIssue = allIssues.find(
                (i) => i.repo.fullName === p.repo_full_name && i.number === p.issue_number
              );
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <IssueRepoBadge repo={p.repo_full_name} />
                      {matchedIssue ? (
                        <button
                          className="truncate font-medium text-left hover:underline"
                          onClick={() => onIssueClick?.(matchedIssue)}
                        >
                          #{p.issue_number} {matchedIssue.title}
                        </button>
                      ) : (
                        <span className="font-medium">#{p.issue_number}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] mr-1">{p.from_priority}</Badge>
                      →
                      <Badge variant="outline" className="text-[10px] ml-1">{p.to_priority}</Badge>
                      {" "}triggered by #{p.triggered_by_issue}
                      {" "}<RelativeTime date={p.promoted_at} />
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => undoMutation.mutate(p.id)}
                    disabled={undoMutation.isPending}
                  >
                    <Undo2 className="mr-1 size-3" />
                    Undo
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stale issues */}
      {hasStale && (
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-medium">
            <Clock className="size-4 text-orange-500" />
            Stale in To Do ({data.staleIssues.length})
          </h4>
          <div className="space-y-2">
            {data.staleIssues.map((issue) => (
              <button
                key={issue.id}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-sm text-left hover:bg-accent/50"
                onClick={() => onIssueClick?.(issue)}
              >
                <IssuePriorityBadge priority={issue.priority} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{issue.title}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{issue.number}</span>
                    <IssueRepoBadge repo={issue.repo.fullName} />
                    <span className="text-xs text-muted-foreground">
                      created <RelativeTime date={issue.createdAt} />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

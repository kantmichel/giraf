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
import { usePriorityReview, useUndoPromotion } from "@/hooks/use-priority-review";
import type { NormalizedIssue } from "@/types/github";
import { useIssues } from "@/hooks/use-issues";
import type { NormalizedUser } from "@/types/github";

function OverBudgetSection({
  priority,
  issues,
  max,
  over,
}: {
  priority: string;
  issues: NormalizedIssue[];
  max: number;
  over: number;
}) {
  const [open, setOpen] = useState(false);

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
        <div className="divide-y border-t">
          {issues.map((issue) => (
            <div key={issue.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2 text-sm">
              <span className="truncate">{issue.title}</span>
              <span className="text-xs text-muted-foreground">#{issue.number}</span>
              <IssueRepoBadge repo={issue.repo.fullName} />
              <RelativeTime date={issue.createdAt} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PriorityReview() {
  const { data: session } = useSession();
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], status: [], milestone: [], search: "" });
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
            {data.promotions.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <IssueRepoBadge repo={p.repo_full_name} />
                    <span className="font-medium">#{p.issue_number}</span>
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
            ))}
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
              <div
                key={issue.id}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

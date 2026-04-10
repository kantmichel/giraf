"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  GitPullRequest,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { useAgentPrs } from "@/hooks/use-agent-prs";
import { cn } from "@/lib/utils";
import type { AgentPr, PrAttentionReason } from "@/types/agents";

interface PrAttentionCardProps {
  className?: string;
}

export function PrAttentionCard({ className }: PrAttentionCardProps) {
  const { data, isLoading, isError } = useAgentPrs();
  const prs = data?.prs ?? [];
  const summary = data?.summary;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <GitPullRequest className="size-3.5" />
          PR Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary strip */}
        {isLoading ? (
          <Skeleton className="h-5 w-3/4" />
        ) : isError ? (
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load PR data.
          </p>
        ) : summary ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                {summary.totalOpen}
              </span>{" "}
              open
            </span>
            {summary.totalOpen > 0 && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  avg{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {summary.avgAgeDays}d
                  </span>
                </span>
              </>
            )}
            {summary.conflicts > 0 && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 border-red-200/70 bg-red-50 px-1.5 text-[10px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                <AlertTriangle className="size-3" />
                {summary.conflicts} conflict
                {summary.conflicts > 1 ? "s" : ""}
              </Badge>
            )}
            {summary.readyToMerge > 0 && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 border-green-200/70 bg-green-50 px-1.5 text-[10px] text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
              >
                <CheckCircle2 className="size-3" />
                {summary.readyToMerge} ready
              </Badge>
            )}
            {summary.awaitingReview > 0 && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 border-blue-200/70 bg-blue-50 px-1.5 text-[10px] text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
              >
                <Eye className="size-3" />
                {summary.awaitingReview} review
              </Badge>
            )}
          </div>
        ) : null}

        {/* Row list */}
        {isLoading ? (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : prs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
            <FileText className="size-6 text-muted-foreground/40" />
            <p className="mt-2 text-xs text-muted-foreground">
              No open agent PRs right now.
            </p>
          </div>
        ) : (
          <TooltipProvider delayDuration={150}>
            <ScrollArea className="h-[460px] -mr-3 pr-3">
              <div className="flex flex-col gap-1.5">
                {prs.map((pr) => (
                  <PrRow
                    key={`${pr.repo.owner}/${pr.repo.name}#${pr.number}`}
                    pr={pr}
                  />
                ))}
              </div>
            </ScrollArea>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

function PrRow({ pr }: { pr: AgentPr }) {
  return (
    <a
      href={pr.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-2 rounded-md border border-border/60 bg-card p-2.5 transition-colors hover:border-border hover:bg-accent/40"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <IssueRepoBadge repo={`${pr.repo.owner}/${pr.repo.name}`} />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            #{pr.number}
          </span>
          <AgePill ageDays={pr.ageDays} createdAt={pr.createdAt} />
          {pr.draft && (
            <Badge
              variant="outline"
              className="h-4 px-1 text-[9px] font-normal uppercase tracking-wide text-muted-foreground"
            >
              draft
            </Badge>
          )}
          <ReasonIcons reasons={pr.reasons} />
        </div>
        <div className="truncate text-xs font-medium leading-tight">
          {pr.title}
        </div>
      </div>
      <ExternalLink className="size-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

function ReasonIcons({ reasons }: { reasons: PrAttentionReason[] }) {
  const prioritized = reasons.filter(
    (r) => r !== "draft" && r !== "fresh" && r !== "stale"
  );
  if (prioritized.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {prioritized.includes("conflict") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="size-3 text-red-500" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="text-xs">Merge conflicts</span>
          </TooltipContent>
        </Tooltip>
      )}
      {prioritized.includes("ready-to-merge") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircle2 className="size-3 text-green-500" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="text-xs">Approved — ready to merge</span>
          </TooltipContent>
        </Tooltip>
      )}
      {prioritized.includes("awaiting-review") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Eye className="size-3 text-blue-500" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <span className="text-xs">Awaiting review</span>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function AgePill({
  ageDays,
  createdAt,
}: {
  ageDays: number;
  createdAt?: string;
}) {
  const label =
    ageDays < 1
      ? `${Math.max(1, Math.round(ageDays * 24))}h`
      : `${Math.round(ageDays)}d`;

  const classes =
    ageDays < 1
      ? "bg-muted/50 text-muted-foreground"
      : ageDays < 3
        ? "bg-muted/50 text-foreground"
        : ageDays < 7
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300";

  const pill = (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        classes
      )}
    >
      {label}
    </span>
  );

  if (!createdAt) return pill;

  const absolute = new Date(createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent side="top">
        <span className="text-xs">Opened {absolute}</span>
      </TooltipContent>
    </Tooltip>
  );
}

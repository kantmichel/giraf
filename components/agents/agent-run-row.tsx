"use client";

import { Pause } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { AgentKindIcon } from "./agent-kind-icon";
import { AgentPipelineRail } from "./agent-pipeline-rail";
import { KIND_ICON_BG } from "@/lib/agents/stage-model";
import { cn } from "@/lib/utils";
import type { AgentRun } from "@/types/agents";

interface AgentRunRowProps {
  run: AgentRun;
  onClick: (run: AgentRun) => void;
}

export function AgentRunRow({ run, onClick }: AgentRunRowProps) {
  const currentStage = run.stages[run.currentStageIndex];

  const tint =
    run.status === "failed"
      ? "bg-red-50/60 border-red-200/70 dark:bg-red-500/5 dark:border-red-500/20"
      : "bg-card border-border/60";

  const titleNumber = run.issue
    ? `#${run.issue.number}`
    : run.runNumber
      ? `#${run.runNumber}`
      : "";

  return (
    <button
      type="button"
      onClick={() => onClick(run)}
      className={cn(
        "group flex w-full items-center gap-4 rounded-lg border px-5 py-4 text-left transition-all hover:border-border hover:bg-accent/40",
        tint
      )}
    >
      {/* Kind icon card */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          KIND_ICON_BG[run.kind]
        )}
      >
        <AgentKindIcon kind={run.kind} className="size-5" />
      </div>

      {/* Title block */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {run.actor && (
            <Avatar className="size-4">
              <AvatarImage src={run.actor.avatarUrl} alt={run.actor.login} />
              <AvatarFallback className="text-[8px]">
                {run.actor.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          {titleNumber && (
            <span className="text-xs text-muted-foreground">{titleNumber}</span>
          )}
          {run.subtitle && <IssueRepoBadge repo={run.subtitle} />}
        </div>
        <div className="truncate text-sm font-medium leading-tight">
          {run.title}
        </div>
      </div>

      {/* Stage blocks */}
      <div className="hidden shrink-0 md:flex">
        <AgentPipelineRail stages={run.stages} showCodes />
      </div>

      {/* Status + time */}
      <div className="flex w-32 shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {run.status === "paused" && (
            <Pause className="size-3 text-amber-500" />
          )}
          <Badge
            variant="secondary"
            className="h-5 px-2 text-[10px] font-medium"
          >
            {currentStage?.def.label ?? "Unknown"}
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground">
          <RelativeTime date={run.updatedAt} />
        </span>
      </div>
    </button>
  );
}

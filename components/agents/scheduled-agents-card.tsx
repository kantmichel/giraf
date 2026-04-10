"use client";

import { CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { AgentPipelineRail } from "./agent-pipeline-rail";
import type { ScheduledAgent, AgentStage } from "@/types/agents";

interface ScheduledAgentsCardProps {
  scheduled: ScheduledAgent[];
}

export function ScheduledAgentsCard({ scheduled }: ScheduledAgentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" />
          Scheduled
          <span className="text-xs font-normal text-muted-foreground">
            ({scheduled.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {scheduled.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No scheduled workflows imported yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Import a workflow from <span className="font-medium">Settings</span>{" "}
              to see it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {scheduled.map((agent) => (
              <ScheduledAgentRow key={agent.workflow.id} agent={agent} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduledAgentRow({ agent }: { agent: ScheduledAgent }) {
  const displayName =
    agent.workflow.displayName ?? agent.workflow.workflow.name;
  const previewStages: AgentStage[] = agent.workflow.stages.map((def) => ({
    def,
    status: "pending",
  }));

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{displayName}</span>
            {agent.lastRunConclusion === "success" && (
              <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />
            )}
            {agent.lastRunConclusion === "failure" && (
              <XCircle className="size-3.5 shrink-0 text-red-500" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <IssueRepoBadge
              repo={`${agent.workflow.repo.owner}/${agent.workflow.repo.name}`}
            />
            <span className="text-[11px] text-muted-foreground">
              {agent.cadenceLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {agent.nextRunAt ? (
            <>
              <span className="text-[11px] text-muted-foreground">Next:</span>
              <span className="text-[11px] font-medium">
                <RelativeTime date={agent.nextRunAt} />
              </span>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Next run unknown
            </span>
          )}
        </div>
      </div>
      {previewStages.length > 0 && (
        <AgentPipelineRail stages={previewStages} showCodes />
      )}
    </div>
  );
}

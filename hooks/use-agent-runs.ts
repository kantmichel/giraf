"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIssues } from "./use-issues";
import { deriveClaudeRuns } from "@/lib/agents/derive-claude-runs";
import { mapWorkflowRunToAgentRun } from "@/lib/agents/map-workflow-run";
import {
  computeDateRange,
  withinRange,
  type DateRange,
} from "@/lib/agents/date-range";
import type {
  AgentRun,
  AgentRunStatus,
  ImportedWorkflow,
  ScheduledAgent,
  WorkflowRunRow,
} from "@/types/agents";
import type { FilterConfig } from "@/types/github";

const EMPTY_FILTERS_OPEN: FilterConfig = {
  repos: [],
  assignees: [],
  labels: [],
  priority: [],
  effort: [],
  status: [],
  ai: [],
  version: [],
  hasPr: false,
  state: "open",
  milestone: [],
  search: "",
};

const EMPTY_FILTERS_CLOSED: FilterConfig = {
  ...EMPTY_FILTERS_OPEN,
  state: "closed",
};

const DEFAULT_RANGE: DateRange = computeDateRange("last-24h");

/**
 * Backfill horizon for Claude agent runs. Corresponds to when flipstream
 * started building pulse-fe, so older closed issues are unlikely to have
 * any meaningful Claude activity attached.
 */
const AGENT_CLOSED_SINCE = new Date("2025-10-01T00:00:00Z");

interface WorkflowRunsResponse {
  runs: WorkflowRunRow[];
  imported: ImportedWorkflow[];
  scheduled: ScheduledAgent[];
}

export interface AgentKpis {
  running: number;
  queued: number;
  paused: number;
  doneInRange: number;
  failedInRange: number;
  successRateInRange: number;
  avgCycleMsInRange: number;
}

export function useAgentRuns(range: DateRange = DEFAULT_RANGE) {
  const openQuery = useIssues(EMPTY_FILTERS_OPEN, 0, { pollIntervalMs: 30_000 });
  const closedQuery = useIssues(EMPTY_FILTERS_CLOSED, 0, {
    pollIntervalMs: 5 * 60_000,
    closedSince: AGENT_CLOSED_SINCE,
  });

  const workflowQuery = useQuery<WorkflowRunsResponse>({
    queryKey: ["agents", "workflow-runs"],
    queryFn: async () => {
      const res = await fetch("/api/agents/workflow-runs");
      if (!res.ok) throw new Error("Failed to load workflow runs");
      return res.json();
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
  });

  const runs = useMemo<AgentRun[]>(() => {
    const claude = deriveClaudeRuns(
      openQuery.allIssues,
      closedQuery.allIssues
    );
    const ghRows = workflowQuery.data?.runs ?? [];
    const imported = workflowQuery.data?.imported ?? [];
    const gh = ghRows
      .map((row) => mapWorkflowRunToAgentRun(row, imported))
      .filter((r): r is AgentRun => r !== null);
    return [...claude, ...gh].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [openQuery.allIssues, closedQuery.allIssues, workflowQuery.data]);

  const activeRuns = useMemo(
    () => runs.filter((r) => isActiveStatus(r.status)),
    [runs]
  );

  const completedRuns = useMemo(
    () =>
      runs
        .filter((r) => r.status === "completed" || r.status === "failed")
        .filter((r) => withinRange(r.updatedAt, range)),
    [runs, range]
  );

  const kpis = useMemo<AgentKpis>(
    () => computeKpis(runs, range),
    [runs, range]
  );
  const stageCounts = useMemo(
    () => computeStageCounts(activeRuns),
    [activeRuns]
  );

  return {
    runs,
    activeRuns,
    completedRuns,
    scheduledAgents: workflowQuery.data?.scheduled ?? [],
    importedWorkflows: workflowQuery.data?.imported ?? [],
    kpis,
    stageCounts,
    isLoading:
      openQuery.isLoading || closedQuery.isLoading || workflowQuery.isLoading,
    isError:
      openQuery.isError || closedQuery.isError || workflowQuery.isError,
    refetch: () => {
      openQuery.refetch();
      closedQuery.refetch();
      workflowQuery.refetch();
    },
  };
}

function isActiveStatus(status: AgentRunStatus): boolean {
  return status === "running" || status === "queued" || status === "paused";
}

function computeKpis(runs: AgentRun[], range: DateRange): AgentKpis {
  let running = 0;
  let queued = 0;
  let paused = 0;
  let doneInRange = 0;
  let failedInRange = 0;
  let cycleSum = 0;
  let cycleCount = 0;

  for (const run of runs) {
    if (run.status === "running") running++;
    else if (run.status === "queued") queued++;
    else if (run.status === "paused") paused++;

    if (withinRange(run.updatedAt, range)) {
      if (run.status === "completed") {
        doneInRange++;
        if (run.durationMs) {
          cycleSum += run.durationMs;
          cycleCount++;
        }
      }
      if (run.status === "failed") failedInRange++;
    }
  }

  const totalInRange = doneInRange + failedInRange;
  const successRateInRange =
    totalInRange === 0 ? 100 : Math.round((doneInRange / totalInRange) * 100);
  const avgCycleMsInRange =
    cycleCount > 0 ? Math.round(cycleSum / cycleCount) : 0;

  return {
    running,
    queued,
    paused,
    doneInRange,
    failedInRange,
    successRateInRange,
    avgCycleMsInRange,
  };
}

function computeStageCounts(
  activeRuns: AgentRun[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const run of activeRuns) {
    const currentStage = run.stages[run.currentStageIndex];
    if (!currentStage) continue;
    const key = currentStage.def.label;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { listImportedWorkflows } from "@/lib/db/agent-workflows";
import { getRunsForImportedWorkflows } from "@/lib/db/workflow-runs";
import { syncStaleImportedWorkflows } from "@/lib/agents/sync-workflow-runs";
import {
  computeNextRun,
  humanizeCron,
} from "@/lib/agents/compute-schedule";
import type { ScheduledAgent, WorkflowRunRow } from "@/types/agents";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const octokit = getOctokit(session.accessToken);

    // Fire-and-forget background sync
    syncStaleImportedWorkflows(octokit, workspace.id).catch(() => {});

    const imported = listImportedWorkflows(workspace.id);
    const runs = getRunsForImportedWorkflows(workspace.id);

    const scheduled: ScheduledAgent[] = imported
      .filter((w) => w.enabled && w.scheduleCrons.length > 0)
      .map((w) => {
        const lastRun = findLastScheduledRun(runs, w.workflow.id);
        return {
          workflow: w,
          nextRunAt: computeNextRun(w.scheduleCrons)?.toISOString() ?? null,
          lastRunAt: lastRun?.created_at ?? null,
          lastRunConclusion: lastRun
            ? normaliseConclusion(lastRun.conclusion)
            : null,
          cadenceLabel: humanizeCron(w.scheduleCrons[0]),
        };
      });

    return NextResponse.json({ runs, imported, scheduled });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function findLastScheduledRun(
  runs: WorkflowRunRow[],
  workflowId: number
): WorkflowRunRow | undefined {
  return runs.find(
    (r) => r.workflow_id === workflowId && r.event === "schedule"
  );
}

function normaliseConclusion(
  value: string | null
): "success" | "failure" | "cancelled" | "skipped" | null {
  if (!value) return null;
  if (
    value === "success" ||
    value === "failure" ||
    value === "cancelled" ||
    value === "skipped"
  ) {
    return value;
  }
  return "failure";
}

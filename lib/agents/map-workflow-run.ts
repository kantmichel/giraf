import type {
  AgentRun,
  AgentRunStatus,
  AgentStage,
  ImportedWorkflow,
  StageStatus,
  WorkflowJobSummary,
  WorkflowRunRow,
} from "@/types/agents";
import type { GHWorkflowJob } from "@/lib/github/workflow-runs";

/**
 * Map a cached workflow_runs row + its imported workflow definition into an AgentRun.
 * The stage shape comes from the imported workflow (not the run's jobs) — jobs just
 * drive the per-stage status.
 */
export function mapWorkflowRunToAgentRun(
  row: WorkflowRunRow,
  imported: ImportedWorkflow[]
): AgentRun | null {
  const workflow = imported.find(
    (w) =>
      w.workflow.id === row.workflow_id &&
      w.repo.owner === row.repo_owner &&
      w.repo.name === row.repo_name
  );
  if (!workflow) return null;

  // Drop noise: completed runs whose overall conclusion is "skipped" (no jobs
  // ran at all). Safety net for rows that predate the sync-side filter.
  if (row.status === "completed" && row.conclusion === "skipped") return null;

  const jobs: GHWorkflowJob[] = row.jobs_json ? JSON.parse(row.jobs_json) : [];

  // Also drop runs where every job was skipped (e.g. path-filter misses where
  // GitHub still reports conclusion="success" at the run level).
  if (
    row.status === "completed" &&
    jobs.length > 0 &&
    jobs.every((j) => j.conclusion === "skipped")
  ) {
    return null;
  }
  const jobByName = new Map<string, GHWorkflowJob>();
  for (const j of jobs) jobByName.set(j.name, j);

  const stages: AgentStage[] = workflow.stages.map((def) => {
    const matchingJob = (def.jobNames ?? []).map((n) => jobByName.get(n)).find(Boolean);
    const status: StageStatus = matchingJob
      ? jobToStageStatus(matchingJob)
      : row.status === "completed"
        ? row.conclusion === "success"
          ? "complete"
          : row.conclusion === "skipped"
            ? "skipped"
            : "failed"
        : "pending";
    return {
      def,
      status,
      startedAt: matchingJob?.started_at ?? undefined,
      endedAt: matchingJob?.completed_at ?? undefined,
    };
  });

  const currentStageIndex = findCurrentStageIndex(stages);
  const runStatus = mapRunStatus(row);
  const runConclusion = normaliseConclusion(row.conclusion);

  const jobSummaries: WorkflowJobSummary[] = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    status: j.status,
    conclusion: normaliseConclusion(j.conclusion),
    startedAt: j.started_at,
    completedAt: j.completed_at,
    htmlUrl: j.html_url ?? row.html_url,
  }));

  return {
    id: `gh-action:${row.id}`,
    kind: "gh-action",
    title: workflow.displayName ?? workflow.workflow.name,
    subtitle: `${row.repo_owner}/${row.repo_name}`,
    status: runStatus,
    currentStageIndex,
    stages,
    startedAt: row.run_started_at ?? row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.status === "completed" ? row.updated_at : undefined,
    durationMs:
      row.status === "completed"
        ? new Date(row.updated_at).getTime() -
          new Date(row.run_started_at ?? row.created_at).getTime()
        : Date.now() - new Date(row.run_started_at ?? row.created_at).getTime(),
    workflow: {
      id: row.workflow_id,
      name: row.workflow_name,
      path: row.workflow_path,
      htmlUrl: row.html_url,
    },
    headBranch: row.head_branch ?? undefined,
    headSha: row.head_sha ?? undefined,
    conclusion: runConclusion,
    runNumber: row.run_number ?? undefined,
    actor:
      row.actor_login && row.actor_avatar_url
        ? { login: row.actor_login, avatarUrl: row.actor_avatar_url }
        : undefined,
    jobs: jobSummaries,
  };
}

function findCurrentStageIndex(stages: AgentStage[]): number {
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].status === "active" || stages[i].status === "paused") return i;
  }
  for (let i = stages.length - 1; i >= 0; i--) {
    if (stages[i].status === "complete" || stages[i].status === "failed") return i;
  }
  return 0;
}

function jobToStageStatus(job: GHWorkflowJob): StageStatus {
  if (job.status === "queued") return "pending";
  if (job.status === "in_progress") return "active";
  const conclusion = normaliseConclusion(job.conclusion);
  if (conclusion === "success") return "complete";
  if (conclusion === "skipped") return "skipped";
  if (conclusion === "failure" || conclusion === "cancelled") return "failed";
  return "complete";
}

function mapRunStatus(row: WorkflowRunRow): AgentRunStatus {
  if (row.status === "queued") return "queued";
  if (row.status === "in_progress") return "running";
  const conclusion = normaliseConclusion(row.conclusion);
  if (conclusion === "success") return "completed";
  if (conclusion === "skipped") return "completed";
  return "failed";
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

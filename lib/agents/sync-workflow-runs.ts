import type { Octokit } from "@octokit/rest";
import type { ImportedWorkflow, WorkflowRunRow } from "@/types/agents";
import {
  getStaleImportedWorkflows,
  updateImportedWorkflow,
} from "@/lib/db/agent-workflows";
import {
  deleteWorkflowRun,
  getSyncState,
  hasInProgressRuns,
  listCancelledRuns,
  purgeSkippedRuns,
  setSyncState,
  upsertWorkflowRun,
} from "@/lib/db/workflow-runs";
import {
  listWorkflowRunJobs,
  listWorkflowRuns,
  type GHWorkflowJob,
  type GHWorkflowRun,
} from "@/lib/github/workflow-runs";

const STALE_THRESHOLD_MS = 30_000;
const BACKFILL_PER_PAGE = 50;
const DELTA_PER_PAGE = 30;

/**
 * Decide whether a cancelled run was almost certainly killed by GitHub's
 * concurrency rules (a newer run superseded it) rather than by a human.
 *
 * Detection uses data we already have locally — no API calls:
 *
 *   - Real human cancellations happen after at least one job has started
 *     running, so `started_at` will be set on some job.
 *   - Concurrency cancellations happen before any job executes, so either
 *     the jobs array is empty or every job is still in `queued` state with
 *     no `started_at`.
 *
 * This heuristic misses the rare case where concurrency cancels after jobs
 * began (which looks identical to a human cancel), but catches the common
 * case that floods the dashboard.
 */
function isLikelySupersededCancellation(
  runStatus: string | null,
  runConclusion: string | null,
  jobs: Pick<GHWorkflowJob, "status" | "started_at">[]
): boolean {
  if (runStatus !== "completed") return false;
  if (runConclusion !== "cancelled") return false;
  if (jobs.length === 0) return true;
  return jobs.every((j) => !j.started_at || j.status === "queued");
}

/**
 * Sync workflow runs for a single imported workflow. Fetches runs created since the
 * last synced timestamp, upserts them, and fetches jobs for any in-progress runs so
 * the dashboard can render per-stage status.
 */
export async function syncImportedWorkflowRuns(
  octokit: Octokit,
  workflow: ImportedWorkflow
): Promise<void> {
  const state = getSyncState(workflow.workspaceId, workflow.id);
  const since = state?.last_synced_at;
  const runs = await listWorkflowRuns(
    octokit,
    workflow.repo.owner,
    workflow.repo.name,
    workflow.workflow.id,
    {
      perPage: since ? DELTA_PER_PAGE : BACKFILL_PER_PAGE,
      since: since ?? undefined,
    }
  );

  const now = new Date().toISOString();
  let lastRunId = state?.last_run_id ?? null;

  for (const run of runs) {
    // Skip noise: path-filtered / conditional runs that resolved to "skipped"
    // without actually doing anything. GitHub fires a workflow_run event for
    // every push even when no jobs will execute; those show up with
    // conclusion === "skipped" and add nothing to the agent dashboard.
    if (run.status === "completed" && run.conclusion === "skipped") {
      if (!lastRunId || run.id > lastRunId) lastRunId = run.id;
      continue;
    }

    // Fetch jobs once per run — needed both for the drawer and for the
    // supersession heuristic below.
    const jobs = await listWorkflowRunJobs(
      octokit,
      workflow.repo.owner,
      workflow.repo.name,
      run.id
    );

    // Skip concurrency-cancelled runs: cancelled before any job could start
    // = GitHub supersession, not a real failure.
    if (
      isLikelySupersededCancellation(run.status, run.conclusion as string, jobs)
    ) {
      if (!lastRunId || run.id > lastRunId) lastRunId = run.id;
      continue;
    }

    // Also skip runs where every job was skipped (belt-and-braces: some runs
    // report conclusion="success" but all jobs skipped due to `if:` gates).
    if (
      run.status === "completed" &&
      jobs.length > 0 &&
      jobs.every((j) => j.conclusion === "skipped")
    ) {
      if (!lastRunId || run.id > lastRunId) lastRunId = run.id;
      continue;
    }

    const jobsJson = JSON.stringify(jobs);
    upsertWorkflowRun(runToRow(run, workflow, jobsJson, now));

    if (!lastRunId || run.id > lastRunId) lastRunId = run.id;
  }

  setSyncState(workflow.workspaceId, workflow.id, now, lastRunId);
  updateImportedWorkflow(workflow.id, { lastSyncedAt: now });
}

/**
 * Sync all stale imported workflows in parallel for a workspace.
 * Also forces a sync for workflows that have in-progress runs in the cache.
 */
export async function syncStaleImportedWorkflows(
  octokit: Octokit,
  workspaceId: string
): Promise<void> {
  // Local cleanup passes — zero API cost, safe to run every cycle.
  purgeSkippedRuns(workspaceId);
  purgeSupersededCancellationsFor(workspaceId);

  const stale = getStaleImportedWorkflows(workspaceId, STALE_THRESHOLD_MS);
  const toSync = stale;

  await Promise.allSettled(
    toSync.map((w) => syncImportedWorkflowRuns(octokit, w).catch(() => undefined))
  );
}

/**
 * Scan cached cancelled runs and delete any that look like concurrency
 * supersessions, based on the jobs_json we already cached — no GitHub
 * API calls required.
 */
function purgeSupersededCancellationsFor(workspaceId: string): number {
  const cancelled = listCancelledRuns(workspaceId, 500);
  if (cancelled.length === 0) return 0;
  let deleted = 0;
  for (const row of cancelled) {
    let jobs: GHWorkflowJob[] = [];
    try {
      jobs = row.jobs_json ? (JSON.parse(row.jobs_json) as GHWorkflowJob[]) : [];
    } catch {
      jobs = [];
    }
    if (isLikelySupersededCancellation(row.status, row.conclusion, jobs)) {
      deleteWorkflowRun(workspaceId, row.id);
      deleted++;
    }
  }
  return deleted;
}

function runToRow(
  run: GHWorkflowRun,
  workflow: ImportedWorkflow,
  jobsJson: string | null,
  fetchedAt: string
): WorkflowRunRow {
  return {
    id: run.id,
    workspace_id: workflow.workspaceId,
    agent_workflow_id: workflow.id,
    repo_owner: workflow.repo.owner,
    repo_name: workflow.repo.name,
    workflow_id: workflow.workflow.id,
    workflow_name: workflow.workflow.name,
    workflow_path: workflow.workflow.path,
    head_sha: run.head_sha ?? null,
    head_branch: run.head_branch ?? null,
    event: run.event,
    status: (run.status ?? "queued") as WorkflowRunRow["status"],
    conclusion: normaliseConclusionString(run.conclusion),
    html_url: run.html_url,
    run_number: run.run_number ?? null,
    run_started_at: run.run_started_at ?? null,
    created_at: run.created_at,
    updated_at: run.updated_at,
    actor_login: run.actor?.login ?? null,
    actor_avatar_url: run.actor?.avatar_url ?? null,
    jobs_json: jobsJson,
    fetched_at: fetchedAt,
  };
}

function normaliseConclusionString(
  value: string | null | undefined
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

// Re-export for convenience
export { hasInProgressRuns };

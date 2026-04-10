import { db } from "./index";
import type { WorkflowRunRow } from "@/types/agents";

interface SyncStateRow {
  workspace_id: string;
  agent_workflow_id: number;
  last_synced_at: string;
  last_run_id: number | null;
}

export function getRunsForImportedWorkflows(
  workspaceId: string
): WorkflowRunRow[] {
  return db
    .prepare(
      `SELECT wr.* FROM workflow_runs wr
       INNER JOIN agent_workflows aw ON aw.id = wr.agent_workflow_id
       WHERE wr.workspace_id = ? AND aw.enabled = 1
       ORDER BY wr.created_at DESC
       LIMIT 200`
    )
    .all(workspaceId) as WorkflowRunRow[];
}

export function upsertWorkflowRun(row: WorkflowRunRow): void {
  db.prepare(
    `INSERT INTO workflow_runs (
      id, workspace_id, agent_workflow_id, repo_owner, repo_name,
      workflow_id, workflow_name, workflow_path, head_sha, head_branch,
      event, status, conclusion, html_url, run_number, run_started_at,
      created_at, updated_at, actor_login, actor_avatar_url, jobs_json, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      conclusion = excluded.conclusion,
      updated_at = excluded.updated_at,
      jobs_json = excluded.jobs_json,
      fetched_at = excluded.fetched_at`
  ).run(
    row.id,
    row.workspace_id,
    row.agent_workflow_id,
    row.repo_owner,
    row.repo_name,
    row.workflow_id,
    row.workflow_name,
    row.workflow_path,
    row.head_sha,
    row.head_branch,
    row.event,
    row.status,
    row.conclusion,
    row.html_url,
    row.run_number,
    row.run_started_at,
    row.created_at,
    row.updated_at,
    row.actor_login,
    row.actor_avatar_url,
    row.jobs_json,
    row.fetched_at
  );
}

export function getSyncState(
  workspaceId: string,
  agentWorkflowId: number
): SyncStateRow | null {
  const row = db
    .prepare(
      "SELECT * FROM workflow_sync_state WHERE workspace_id = ? AND agent_workflow_id = ?"
    )
    .get(workspaceId, agentWorkflowId) as SyncStateRow | undefined;
  return row ?? null;
}

export function setSyncState(
  workspaceId: string,
  agentWorkflowId: number,
  lastSyncedAt: string,
  lastRunId: number | null
): void {
  db.prepare(
    `INSERT INTO workflow_sync_state (workspace_id, agent_workflow_id, last_synced_at, last_run_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(workspace_id, agent_workflow_id) DO UPDATE SET
       last_synced_at = excluded.last_synced_at,
       last_run_id = excluded.last_run_id`
  ).run(workspaceId, agentWorkflowId, lastSyncedAt, lastRunId);
}

export function hasInProgressRuns(
  workspaceId: string,
  agentWorkflowId: number
): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM workflow_runs
       WHERE workspace_id = ? AND agent_workflow_id = ? AND status != 'completed'
       LIMIT 1`
    )
    .get(workspaceId, agentWorkflowId);
  return row !== undefined;
}

/**
 * Remove cached runs whose overall conclusion is "skipped" — these are
 * path-filtered / conditional runs that GitHub fires on every push but which
 * don't actually execute anything. One-shot cleanup for pre-filter data.
 */
export function purgeSkippedRuns(workspaceId: string): number {
  const result = db
    .prepare(
      `DELETE FROM workflow_runs
       WHERE workspace_id = ? AND status = 'completed' AND conclusion = 'skipped'`
    )
    .run(workspaceId);
  return result.changes;
}

/**
 * List cached cancelled runs for a workspace. Used by the supersession
 * cleanup to back-process runs that may have been cancelled by concurrency.
 */
export function listCancelledRuns(
  workspaceId: string,
  limit: number = 50
): WorkflowRunRow[] {
  return db
    .prepare(
      `SELECT * FROM workflow_runs
       WHERE workspace_id = ? AND status = 'completed' AND conclusion = 'cancelled'
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(workspaceId, limit) as WorkflowRunRow[];
}

/**
 * Delete a single workflow run by id (scoped to workspace for safety).
 */
export function deleteWorkflowRun(
  workspaceId: string,
  runId: number
): boolean {
  const result = db
    .prepare(
      "DELETE FROM workflow_runs WHERE workspace_id = ? AND id = ?"
    )
    .run(workspaceId, runId);
  return result.changes > 0;
}

import { db } from "./index";
import type { AgentStageDef, ImportedWorkflow } from "@/types/agents";

interface AgentWorkflowRow {
  id: number;
  workspace_id: string;
  repo_owner: string;
  repo_name: string;
  workflow_id: number;
  workflow_name: string;
  workflow_path: string;
  display_name: string | null;
  description: string | null;
  stages_json: string;
  schedule_crons_json: string;
  enabled: number;
  imported_at: string;
  imported_by: string;
  last_synced_at: string | null;
}

function rowToImported(row: AgentWorkflowRow): ImportedWorkflow {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    repo: { owner: row.repo_owner, name: row.repo_name },
    workflow: {
      id: row.workflow_id,
      name: row.workflow_name,
      path: row.workflow_path,
    },
    displayName: row.display_name,
    description: row.description,
    stages: JSON.parse(row.stages_json) as AgentStageDef[],
    scheduleCrons: JSON.parse(row.schedule_crons_json) as string[],
    enabled: row.enabled === 1,
    importedAt: row.imported_at,
    importedBy: row.imported_by,
    lastSyncedAt: row.last_synced_at,
  };
}

export function listImportedWorkflows(workspaceId: string): ImportedWorkflow[] {
  const rows = db
    .prepare(
      "SELECT * FROM agent_workflows WHERE workspace_id = ? ORDER BY imported_at DESC"
    )
    .all(workspaceId) as AgentWorkflowRow[];
  return rows.map(rowToImported);
}

export function getImportedWorkflow(id: number): ImportedWorkflow | null {
  const row = db
    .prepare("SELECT * FROM agent_workflows WHERE id = ?")
    .get(id) as AgentWorkflowRow | undefined;
  return row ? rowToImported(row) : null;
}

export function getImportedWorkflowByGithubId(
  workspaceId: string,
  owner: string,
  repo: string,
  workflowId: number
): ImportedWorkflow | null {
  const row = db
    .prepare(
      "SELECT * FROM agent_workflows WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ? AND workflow_id = ?"
    )
    .get(workspaceId, owner, repo, workflowId) as AgentWorkflowRow | undefined;
  return row ? rowToImported(row) : null;
}

export interface InsertImportedWorkflowInput {
  workspaceId: string;
  repoOwner: string;
  repoName: string;
  workflowId: number;
  workflowName: string;
  workflowPath: string;
  displayName: string | null;
  description: string | null;
  stages: AgentStageDef[];
  scheduleCrons: string[];
  importedBy: string;
}

export function insertImportedWorkflow(
  input: InsertImportedWorkflowInput
): ImportedWorkflow {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO agent_workflows (
        workspace_id, repo_owner, repo_name, workflow_id,
        workflow_name, workflow_path, display_name, description,
        stages_json, schedule_crons_json, enabled, imported_at, imported_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(workspace_id, repo_owner, repo_name, workflow_id) DO UPDATE SET
        workflow_name = excluded.workflow_name,
        workflow_path = excluded.workflow_path,
        stages_json = excluded.stages_json,
        schedule_crons_json = excluded.schedule_crons_json
      RETURNING id`
    )
    .get(
      input.workspaceId,
      input.repoOwner,
      input.repoName,
      input.workflowId,
      input.workflowName,
      input.workflowPath,
      input.displayName,
      input.description,
      JSON.stringify(input.stages),
      JSON.stringify(input.scheduleCrons),
      now,
      input.importedBy
    ) as { id: number };

  return getImportedWorkflow(result.id)!;
}

export interface UpdateImportedWorkflowInput {
  displayName?: string | null;
  description?: string | null;
  enabled?: boolean;
  stages?: AgentStageDef[];
  scheduleCrons?: string[];
  lastSyncedAt?: string;
}

export function updateImportedWorkflow(
  id: number,
  patch: UpdateImportedWorkflowInput
): ImportedWorkflow | null {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (patch.displayName !== undefined) {
    sets.push("display_name = ?");
    values.push(patch.displayName);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    values.push(patch.description);
  }
  if (patch.enabled !== undefined) {
    sets.push("enabled = ?");
    values.push(patch.enabled ? 1 : 0);
  }
  if (patch.stages !== undefined) {
    sets.push("stages_json = ?");
    values.push(JSON.stringify(patch.stages));
  }
  if (patch.scheduleCrons !== undefined) {
    sets.push("schedule_crons_json = ?");
    values.push(JSON.stringify(patch.scheduleCrons));
  }
  if (patch.lastSyncedAt !== undefined) {
    sets.push("last_synced_at = ?");
    values.push(patch.lastSyncedAt);
  }

  if (sets.length === 0) return getImportedWorkflow(id);

  values.push(id);
  db.prepare(`UPDATE agent_workflows SET ${sets.join(", ")} WHERE id = ?`).run(
    ...values
  );
  return getImportedWorkflow(id);
}

export function deleteImportedWorkflow(id: number): boolean {
  const result = db
    .prepare("DELETE FROM agent_workflows WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function getStaleImportedWorkflows(
  workspaceId: string,
  thresholdMs: number
): ImportedWorkflow[] {
  const cutoff = new Date(Date.now() - thresholdMs).toISOString();
  const rows = db
    .prepare(
      `SELECT aw.* FROM agent_workflows aw
       LEFT JOIN workflow_sync_state wss
         ON wss.workspace_id = aw.workspace_id
         AND wss.agent_workflow_id = aw.id
       WHERE aw.workspace_id = ? AND aw.enabled = 1
         AND (wss.last_synced_at IS NULL OR wss.last_synced_at < ?)`
    )
    .all(workspaceId, cutoff) as AgentWorkflowRow[];
  return rows.map(rowToImported);
}

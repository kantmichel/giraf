import { db } from "./index";

export interface TriageStateRow {
  workspace_id: string;
  repo_full_name: string;
  issue_number: number;
  status: "pending" | "accepted" | "declined" | "snoozed";
  triaged_by: string | null;
  triaged_at: string | null;
}

export function getTriageStates(workspaceId: string): TriageStateRow[] {
  return db
    .prepare("SELECT * FROM triage_state WHERE workspace_id = ?")
    .all(workspaceId) as TriageStateRow[];
}

export function getTriageState(
  workspaceId: string,
  repoFullName: string,
  issueNumber: number
): TriageStateRow | undefined {
  return db
    .prepare(
      "SELECT * FROM triage_state WHERE workspace_id = ? AND repo_full_name = ? AND issue_number = ?"
    )
    .get(workspaceId, repoFullName, issueNumber) as TriageStateRow | undefined;
}

export function setTriageState(
  workspaceId: string,
  repoFullName: string,
  issueNumber: number,
  status: TriageStateRow["status"],
  triagedBy: string
): void {
  db.prepare(
    `INSERT INTO triage_state (workspace_id, repo_full_name, issue_number, status, triaged_by, triaged_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(workspace_id, repo_full_name, issue_number)
     DO UPDATE SET status = ?, triaged_by = ?, triaged_at = datetime('now')`
  ).run(workspaceId, repoFullName, issueNumber, status, triagedBy, status, triagedBy);
}

export function getTriagedKeys(workspaceId: string): Set<string> {
  const rows = getTriageStates(workspaceId);
  return new Set(rows.map((r) => `${r.repo_full_name}:${r.issue_number}`));
}

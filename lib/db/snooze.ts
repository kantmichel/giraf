import { db } from "./index";

export interface SnoozedIssueRow {
  workspace_id: string;
  repo_full_name: string;
  issue_number: number;
  snoozed_by: string;
  snoozed_until: string | null;
  wake_on_activity: number;
  snoozed_at: string;
}

export function snoozeIssue(
  workspaceId: string,
  repoFullName: string,
  issueNumber: number,
  snoozedBy: string,
  snoozedUntil?: string | null,
  wakeOnActivity: boolean = true
): void {
  db.prepare(
    `INSERT INTO snoozed_issues (workspace_id, repo_full_name, issue_number, snoozed_by, snoozed_until, wake_on_activity)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, repo_full_name, issue_number)
     DO UPDATE SET snoozed_until = ?, wake_on_activity = ?, snoozed_at = datetime('now')`
  ).run(
    workspaceId, repoFullName, issueNumber, snoozedBy,
    snoozedUntil || null, wakeOnActivity ? 1 : 0,
    snoozedUntil || null, wakeOnActivity ? 1 : 0
  );
}

export function unsnoozeIssue(
  workspaceId: string,
  repoFullName: string,
  issueNumber: number
): boolean {
  const result = db
    .prepare(
      "DELETE FROM snoozed_issues WHERE workspace_id = ? AND repo_full_name = ? AND issue_number = ?"
    )
    .run(workspaceId, repoFullName, issueNumber);
  return result.changes > 0;
}

export function getSnoozedIssues(workspaceId: string): SnoozedIssueRow[] {
  return db
    .prepare("SELECT * FROM snoozed_issues WHERE workspace_id = ?")
    .all(workspaceId) as SnoozedIssueRow[];
}

export function getSnoozedKeys(workspaceId: string): Set<string> {
  const rows = getSnoozedIssues(workspaceId);
  return new Set(rows.map((r) => `${r.repo_full_name}:${r.issue_number}`));
}

export function autoUnsnoozeExpired(workspaceId: string): number {
  const result = db
    .prepare(
      "DELETE FROM snoozed_issues WHERE workspace_id = ? AND snoozed_until IS NOT NULL AND snoozed_until < datetime('now')"
    )
    .run(workspaceId);
  return result.changes;
}

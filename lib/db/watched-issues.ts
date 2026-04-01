import { db } from "./index";

export function watchIssue(
  workspaceId: string,
  username: string,
  repoFullName: string,
  issueNumber: number
): void {
  db.prepare(
    `INSERT OR IGNORE INTO watched_issues (workspace_id, github_username, repo_full_name, issue_number)
     VALUES (?, ?, ?, ?)`
  ).run(workspaceId, username, repoFullName, issueNumber);
}

export function unwatchIssue(
  workspaceId: string,
  username: string,
  repoFullName: string,
  issueNumber: number
): void {
  db.prepare(
    `DELETE FROM watched_issues
     WHERE workspace_id = ? AND github_username = ? AND repo_full_name = ? AND issue_number = ?`
  ).run(workspaceId, username, repoFullName, issueNumber);
}

export function isWatching(
  workspaceId: string,
  username: string,
  repoFullName: string,
  issueNumber: number
): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM watched_issues
       WHERE workspace_id = ? AND github_username = ? AND repo_full_name = ? AND issue_number = ?`
    )
    .get(workspaceId, username, repoFullName, issueNumber);
  return !!row;
}

export function getWatchedKeys(workspaceId: string, username: string): Set<string> {
  const rows = db
    .prepare(
      "SELECT repo_full_name, issue_number FROM watched_issues WHERE workspace_id = ? AND github_username = ?"
    )
    .all(workspaceId, username) as { repo_full_name: string; issue_number: number }[];
  return new Set(rows.map((r) => `${r.repo_full_name}:${r.issue_number}`));
}

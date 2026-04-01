import { db } from "./index";

export function getClaudeEnabledRepos(workspaceId: string): { owner: string; repo: string }[] {
  return db
    .prepare("SELECT owner, repo FROM claude_enabled_repos WHERE workspace_id = ?")
    .all(workspaceId) as { owner: string; repo: string }[];
}

export function setClaudeEnabled(workspaceId: string, owner: string, repo: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO claude_enabled_repos (workspace_id, owner, repo) VALUES (?, ?, ?)"
  ).run(workspaceId, owner, repo);
}

export function removeClaudeEnabled(workspaceId: string, owner: string, repo: string): void {
  db.prepare(
    "DELETE FROM claude_enabled_repos WHERE workspace_id = ? AND owner = ? AND repo = ?"
  ).run(workspaceId, owner, repo);
}

export function isClaudeEnabled(workspaceId: string, owner: string, repo: string): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM claude_enabled_repos WHERE workspace_id = ? AND owner = ? AND repo = ?"
    )
    .get(workspaceId, owner, repo);
  return row !== undefined;
}

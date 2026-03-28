import { db } from "./index";
import type { TrackedRepoRow } from "@/types/github";

export function getTrackedRepos(workspaceId: string): TrackedRepoRow[] {
  return db
    .prepare("SELECT * FROM tracked_repos WHERE workspace_id = ? ORDER BY added_at DESC")
    .all(workspaceId) as TrackedRepoRow[];
}

export function getTrackedRepo(
  workspaceId: string,
  owner: string,
  repo: string
): TrackedRepoRow | undefined {
  return db
    .prepare(
      "SELECT * FROM tracked_repos WHERE workspace_id = ? AND owner = ? AND repo = ?"
    )
    .get(workspaceId, owner, repo) as TrackedRepoRow | undefined;
}

export function addTrackedRepo(
  workspaceId: string,
  owner: string,
  repo: string,
  addedBy: string
): TrackedRepoRow {
  db.prepare(
    "INSERT OR IGNORE INTO tracked_repos (workspace_id, owner, repo, added_by) VALUES (?, ?, ?, ?)"
  ).run(workspaceId, owner, repo, addedBy);

  return getTrackedRepo(workspaceId, owner, repo)!;
}

export function removeTrackedRepo(
  workspaceId: string,
  owner: string,
  repo: string
): boolean {
  const result = db
    .prepare(
      "DELETE FROM tracked_repos WHERE workspace_id = ? AND owner = ? AND repo = ?"
    )
    .run(workspaceId, owner, repo);

  return result.changes > 0;
}

export function isRepoTracked(
  workspaceId: string,
  owner: string,
  repo: string
): boolean {
  return getTrackedRepo(workspaceId, owner, repo) !== undefined;
}

import { db } from "./index";
import type { NormalizedIssue } from "@/types/github";

export interface ClosedIssuesCacheState {
  workspace_id: string;
  repo_owner: string;
  repo_name: string;
  /** Oldest `closed_at` this repo's cache covers (inclusive, ISO string). */
  cache_start: string;
  /** Exclusive upper bound — typically start of the current month (ISO). */
  cache_end: string;
  last_synced_at: string;
}

export function getCacheState(
  workspaceId: string,
  owner: string,
  repo: string
): ClosedIssuesCacheState | null {
  const row = db
    .prepare(
      `SELECT * FROM closed_issues_cache_state
       WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
    )
    .get(workspaceId, owner, repo) as ClosedIssuesCacheState | undefined;
  return row ?? null;
}

export function setCacheState(state: ClosedIssuesCacheState): void {
  db.prepare(
    `INSERT INTO closed_issues_cache_state (
      workspace_id, repo_owner, repo_name, cache_start, cache_end, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id, repo_owner, repo_name) DO UPDATE SET
      cache_start = excluded.cache_start,
      cache_end = excluded.cache_end,
      last_synced_at = excluded.last_synced_at`
  ).run(
    state.workspace_id,
    state.repo_owner,
    state.repo_name,
    state.cache_start,
    state.cache_end,
    state.last_synced_at
  );
}

/**
 * Return cached historical issues whose `closed_at` falls inside
 * [fromIso, toIso). Parses the stored JSON back into NormalizedIssue.
 */
export function getCachedClosedIssuesInRange(
  workspaceId: string,
  owner: string,
  repo: string,
  fromIso: string,
  toIso: string
): NormalizedIssue[] {
  const rows = db
    .prepare(
      `SELECT issue_json FROM cached_closed_issues
       WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?
         AND closed_at >= ? AND closed_at < ?
       ORDER BY closed_at DESC`
    )
    .all(workspaceId, owner, repo, fromIso, toIso) as {
    issue_json: string;
  }[];
  const out: NormalizedIssue[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.issue_json) as NormalizedIssue);
    } catch {
      // Skip corrupted rows
    }
  }
  return out;
}

/**
 * Bulk-upsert historical closed issues in a single transaction.
 * Skips issues without a `closedAt` field.
 */
export function upsertCachedClosedIssues(
  workspaceId: string,
  owner: string,
  repo: string,
  issues: NormalizedIssue[]
): number {
  if (issues.length === 0) return 0;
  const stmt = db.prepare(
    `INSERT INTO cached_closed_issues (
      workspace_id, repo_owner, repo_name, issue_number, closed_at, issue_json, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(workspace_id, repo_owner, repo_name, issue_number) DO UPDATE SET
      closed_at = excluded.closed_at,
      issue_json = excluded.issue_json,
      cached_at = excluded.cached_at`
  );
  const now = new Date().toISOString();
  let inserted = 0;
  const insertAll = db.transaction((items: NormalizedIssue[]) => {
    for (const issue of items) {
      if (!issue.closedAt) continue;
      stmt.run(
        workspaceId,
        owner,
        repo,
        issue.number,
        issue.closedAt,
        JSON.stringify(issue),
        now
      );
      inserted++;
    }
  });
  insertAll(issues);
  return inserted;
}

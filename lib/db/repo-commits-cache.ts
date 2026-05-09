import { db } from "./index";
import type {
  CommitSource,
  CommitVelocityBucket,
  CommitVelocityBucketSize,
  RepoCommitRow,
  RepoCommitsSyncStateRow,
} from "@/types/github";

export interface RepoCommitInput {
  sha: string;
  committedAt: string;
  authorLogin: string | null;
  prNumber: number | null;
  isMerge: boolean;
}

export function getCacheState(
  workspaceId: string,
  owner: string,
  repo: string
): RepoCommitsSyncStateRow | null {
  const row = db
    .prepare(
      `SELECT * FROM repo_commits_sync_state
       WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
    )
    .get(workspaceId, owner, repo) as RepoCommitsSyncStateRow | undefined;
  return row ?? null;
}

/**
 * Ensure a sync-state row exists for the repo. Subsequent updates use
 * targeted column updates rather than full replacement.
 */
export function ensureCacheState(
  workspaceId: string,
  owner: string,
  repo: string
): void {
  db.prepare(
    `INSERT INTO repo_commits_sync_state (workspace_id, repo_owner, repo_name)
     VALUES (?, ?, ?)
     ON CONFLICT(workspace_id, repo_owner, repo_name) DO NOTHING`
  ).run(workspaceId, owner, repo);
}

export function setRepoCreatedAt(
  workspaceId: string,
  owner: string,
  repo: string,
  createdAtIso: string
): void {
  ensureCacheState(workspaceId, owner, repo);
  db.prepare(
    `UPDATE repo_commits_sync_state SET repo_created_at = ?
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(createdAtIso, workspaceId, owner, repo);
}

export function setSeriesAStart(
  workspaceId: string,
  owner: string,
  repo: string
): void {
  ensureCacheState(workspaceId, owner, repo);
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_a_in_progress = 1, series_a_last_error = NULL
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(workspaceId, owner, repo);
}

export function setSeriesAProgress(
  workspaceId: string,
  owner: string,
  repo: string,
  seen: number,
  oldestIso: string | null
): void {
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_a_progress_seen = ?,
         series_a_oldest_iso = COALESCE(?, series_a_oldest_iso)
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(seen, oldestIso, workspaceId, owner, repo);
}

export function setSeriesAComplete(
  workspaceId: string,
  owner: string,
  repo: string,
  syncedAtIso: string
): void {
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_a_in_progress = 0,
         series_a_last_synced_at = ?,
         series_a_last_error = NULL
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(syncedAtIso, workspaceId, owner, repo);
}

export function setSeriesAError(
  workspaceId: string,
  owner: string,
  repo: string,
  message: string
): void {
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_a_in_progress = 0, series_a_last_error = ?
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(message, workspaceId, owner, repo);
}

export function setSeriesBStart(
  workspaceId: string,
  owner: string,
  repo: string
): void {
  ensureCacheState(workspaceId, owner, repo);
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_b_in_progress = 1,
         series_b_progress_seen = 0,
         series_b_last_error = NULL
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(workspaceId, owner, repo);
}

export function bumpSeriesBProgress(
  workspaceId: string,
  owner: string,
  repo: string,
  prNumber: number,
  prUpdatedAt: string
): void {
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_b_progress_seen = series_b_progress_seen + 1,
         series_b_last_pr_number = MAX(COALESCE(series_b_last_pr_number, 0), ?),
         series_b_last_pr_updated = CASE
           WHEN series_b_last_pr_updated IS NULL THEN ?
           WHEN ? > series_b_last_pr_updated THEN ?
           ELSE series_b_last_pr_updated
         END
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(
    prNumber,
    prUpdatedAt,
    prUpdatedAt,
    prUpdatedAt,
    workspaceId,
    owner,
    repo
  );
}

export function setSeriesBComplete(
  workspaceId: string,
  owner: string,
  repo: string,
  syncedAtIso: string,
  backfillDone: boolean
): void {
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_b_in_progress = 0,
         series_b_last_synced_at = ?,
         series_b_backfill_done = CASE WHEN ? = 1 THEN 1 ELSE series_b_backfill_done END,
         series_b_last_error = NULL
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(syncedAtIso, backfillDone ? 1 : 0, workspaceId, owner, repo);
}

export function setSeriesBError(
  workspaceId: string,
  owner: string,
  repo: string,
  message: string
): void {
  db.prepare(
    `UPDATE repo_commits_sync_state
     SET series_b_in_progress = 0, series_b_last_error = ?
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
  ).run(message, workspaceId, owner, repo);
}

/**
 * Bulk-upsert commit rows for a given source. Runs in a single transaction.
 * Same SHA in different sources are independent rows (composite PK includes source).
 */
export function upsertCommits(
  workspaceId: string,
  owner: string,
  repo: string,
  source: CommitSource,
  commits: RepoCommitInput[]
): number {
  if (commits.length === 0) return 0;
  const stmt = db.prepare(
    `INSERT INTO repo_commits (
       workspace_id, repo_owner, repo_name, commit_sha, source,
       committed_at, author_login, pr_number, is_merge, cached_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, repo_owner, repo_name, source, commit_sha) DO UPDATE SET
       committed_at = excluded.committed_at,
       author_login = excluded.author_login,
       pr_number = excluded.pr_number,
       is_merge = excluded.is_merge,
       cached_at = excluded.cached_at`
  );
  const now = new Date().toISOString();
  let inserted = 0;
  const insertAll = db.transaction((items: RepoCommitInput[]) => {
    for (const c of items) {
      if (!c.committedAt) continue;
      stmt.run(
        workspaceId,
        owner,
        repo,
        c.sha,
        source,
        c.committedAt,
        c.authorLogin,
        c.prNumber,
        c.isMerge ? 1 : 0,
        now
      );
      inserted++;
    }
  });
  insertAll(commits);
  return inserted;
}

/**
 * Replace all PR-original rows for a given PR — used when a PR is force-pushed
 * so that commits no longer reachable get evicted before the new set is upserted.
 */
export function deleteSeriesBForPr(
  workspaceId: string,
  owner: string,
  repo: string,
  prNumber: number
): void {
  db.prepare(
    `DELETE FROM repo_commits
     WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?
       AND source = 'pr_original' AND pr_number = ?`
  ).run(workspaceId, owner, repo, prNumber);
}

/**
 * Aggregate cached commits into time buckets (day/week/month) at SQL level.
 * Buckets are UTC-aligned.
 */
export function getBuckets(
  workspaceId: string,
  owner: string,
  repo: string,
  fromIso: string,
  toIso: string,
  bucket: CommitVelocityBucketSize,
  options?: { excludeMerges?: boolean }
): CommitVelocityBucket[] {
  const bucketExpr =
    bucket === "day"
      ? "substr(committed_at, 1, 10)"
      : bucket === "week"
      ? // Monday of the week containing committed_at, in UTC
        "date(committed_at, 'weekday 0', '-6 days')"
      : "substr(committed_at, 1, 7) || '-01'";

  const mergeFilter =
    options?.excludeMerges
      ? "AND NOT (source = 'default_branch' AND is_merge = 1)"
      : "";

  const rows = db
    .prepare(
      `SELECT source, ${bucketExpr} AS bucket_date, COUNT(*) AS n
       FROM repo_commits
       WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?
         AND committed_at >= ? AND committed_at < ?
         ${mergeFilter}
       GROUP BY source, bucket_date
       ORDER BY bucket_date ASC`
    )
    .all(workspaceId, owner, repo, fromIso, toIso) as {
      source: CommitSource;
      bucket_date: string;
      n: number;
    }[];

  const byDate = new Map<string, CommitVelocityBucket>();
  for (const r of rows) {
    let entry = byDate.get(r.bucket_date);
    if (!entry) {
      entry = { date: r.bucket_date, seriesA: 0, seriesB: 0 };
      byDate.set(r.bucket_date, entry);
    }
    if (r.source === "default_branch") entry.seriesA = r.n;
    else entry.seriesB = r.n;
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Earliest cached commit timestamp across both series — used to decide whether
 * a backfill needs to extend further back.
 */
export function getOldestCommitIso(
  workspaceId: string,
  owner: string,
  repo: string
): string | null {
  const row = db
    .prepare(
      `SELECT MIN(committed_at) AS oldest FROM repo_commits
       WHERE workspace_id = ? AND repo_owner = ? AND repo_name = ?`
    )
    .get(workspaceId, owner, repo) as { oldest: string | null } | undefined;
  return row?.oldest ?? null;
}

export type { RepoCommitRow };

import type { Octokit } from "@octokit/rest";
import {
  bumpSeriesBProgress,
  deleteSeriesBForPr,
  ensureCacheState,
  getCacheState,
  setRepoCreatedAt,
  setSeriesAComplete,
  setSeriesAError,
  setSeriesAProgress,
  setSeriesAStart,
  setSeriesBComplete,
  setSeriesBError,
  setSeriesBStart,
  upsertCommits,
} from "@/lib/db/repo-commits-cache";
import {
  getRepoMetadata,
  listPullCommits,
  streamClosedPulls,
  streamRepoCommits,
} from "@/lib/github/commits";
import { getRateLimit } from "@/lib/github/rate-limit";

const SERIES_B_CONCURRENCY = 5;
const RATE_LIMIT_FLOOR = 200;

/** Module-level lock so two concurrent requests don't kick the same sync twice. */
const inFlight = new Set<string>();

function lockKey(
  workspaceId: string,
  owner: string,
  repo: string,
  series: "a" | "b"
): string {
  return `${workspaceId}:${owner}/${repo}:${series}`;
}

/**
 * Fire-and-forget Series A sync. Cold cache walks repo creation → now,
 * incremental subsequent syncs use `since=last_synced_at`. Streams commits
 * page-by-page and upserts in bounded transactions.
 */
export async function syncSeriesA(
  octokit: Octokit,
  workspaceId: string,
  owner: string,
  repo: string
): Promise<void> {
  const key = lockKey(workspaceId, owner, repo, "a");
  if (inFlight.has(key)) return;
  inFlight.add(key);

  try {
    ensureCacheState(workspaceId, owner, repo);
    const state = getCacheState(workspaceId, owner, repo);
    const isCold = !state?.series_a_last_synced_at;

    if (isCold && !state?.repo_created_at) {
      const meta = await getRepoMetadata(octokit, owner, repo);
      setRepoCreatedAt(workspaceId, owner, repo, meta.createdAt);
    }

    setSeriesAStart(workspaceId, owner, repo);

    const since = isCold
      ? undefined // walk full history
      : state!.series_a_last_synced_at!;

    let seen = 0;
    let oldest: string | null = null;
    for await (const page of streamRepoCommits(octokit, owner, repo, {
      since,
    })) {
      if (page.length === 0) continue;
      upsertCommits(workspaceId, owner, repo, "default_branch", page);
      seen += page.length;
      for (const c of page) {
        if (!oldest || c.committedAt < oldest) oldest = c.committedAt;
      }
      setSeriesAProgress(workspaceId, owner, repo, seen, oldest);
    }

    setSeriesAComplete(workspaceId, owner, repo, new Date().toISOString());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setSeriesAError(workspaceId, owner, repo, message);
    console.error(
      `[cached-commits] Series A sync failed for ${owner}/${repo}:`,
      message
    );
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Fire-and-forget Series B sync. Walks closed PRs sorted by updated_at desc,
 * stops early on warm cache once we hit a PR we've already processed. For each
 * merged PR, fetches its commits and upserts as `pr_original`. Force-pushed PRs
 * are detected by updated_at advancing past the cached cursor and re-synced
 * (existing rows for the PR are deleted before re-insertion).
 */
export async function syncSeriesB(
  octokit: Octokit,
  workspaceId: string,
  owner: string,
  repo: string
): Promise<void> {
  const key = lockKey(workspaceId, owner, repo, "b");
  if (inFlight.has(key)) return;
  inFlight.add(key);

  try {
    ensureCacheState(workspaceId, owner, repo);
    const initialState = getCacheState(workspaceId, owner, repo);
    const cursor = initialState?.series_b_last_pr_updated ?? null;
    setSeriesBStart(workspaceId, owner, repo);

    const queue: { number: number; updatedAt: string; mergedAt: string }[] = [];
    let stop = false;

    pageLoop: for await (const page of streamClosedPulls(octokit, owner, repo)) {
      for (const pr of page) {
        if (cursor && pr.updatedAt < cursor) {
          stop = true;
          break pageLoop;
        }
        if (!pr.mergedAt) continue;
        queue.push({
          number: pr.number,
          updatedAt: pr.updatedAt,
          mergedAt: pr.mergedAt,
        });
      }
    }

    // Process queue in concurrency-capped chunks with a rate-limit guard.
    for (let i = 0; i < queue.length; i += SERIES_B_CONCURRENCY) {
      const rl = await getRateLimit(octokit);
      if (rl.remaining < RATE_LIMIT_FLOOR) {
        const resetAt = new Date(rl.reset * 1000).toISOString();
        throw new Error(
          `GitHub rate limit low (${rl.remaining} left); will resume after ${resetAt}`
        );
      }
      const chunk = queue.slice(i, i + SERIES_B_CONCURRENCY);
      await Promise.all(
        chunk.map(async (pr) => {
          deleteSeriesBForPr(workspaceId, owner, repo, pr.number);
          const commits = await listPullCommits(octokit, owner, repo, pr.number);
          if (commits.length > 0) {
            upsertCommits(workspaceId, owner, repo, "pr_original", commits);
          }
          bumpSeriesBProgress(
            workspaceId,
            owner,
            repo,
            pr.number,
            pr.updatedAt
          );
        })
      );
    }

    // If we walked to the end without an early-stop, the cold backfill is
    // complete; warm syncs that hit an early stop don't change the flag.
    const backfillDone = !stop;
    setSeriesBComplete(
      workspaceId,
      owner,
      repo,
      new Date().toISOString(),
      backfillDone
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setSeriesBError(workspaceId, owner, repo, message);
    console.error(
      `[cached-commits] Series B sync failed for ${owner}/${repo}:`,
      message
    );
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Whether either series is currently syncing — exported for callers that want
 * to short-circuit refetch logic.
 */
export function isSyncInFlight(
  workspaceId: string,
  owner: string,
  repo: string,
  series: "a" | "b"
): boolean {
  return inFlight.has(lockKey(workspaceId, owner, repo, series));
}

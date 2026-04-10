import type { Octokit } from "@octokit/rest";
import { startOfMonth } from "date-fns";
import { listRepoIssues } from "@/lib/github/issues";
import {
  getCacheState,
  getCachedClosedIssuesInRange,
  setCacheState,
  upsertCachedClosedIssues,
} from "@/lib/db/closed-issues-cache";
import type { NormalizedIssue } from "@/types/github";

interface Gap {
  from: string;
  to: string;
}

/**
 * Fetch closed issues for a repo since the given date using a persistent
 * SQLite cache for everything strictly before the start of the current
 * month. Only the current-month slice is ever hit against the GitHub API
 * on a typical request — the historical slice is served from cache and
 * backfilled on demand.
 *
 * First call (cold cache) is expensive: it fetches the entire historical
 * window from GitHub once and stores it. Subsequent calls pay only for
 * the current month, plus any new month that rolled over since last time.
 */
export async function fetchClosedIssuesWithCache(
  octokit: Octokit,
  workspaceId: string,
  owner: string,
  repo: string,
  since: Date
): Promise<NormalizedIssue[]> {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthStartIso = currentMonthStart.toISOString();
  const sinceIso = since.toISOString();

  // 1. Figure out which historical gaps need to be filled from GitHub.
  const gaps = computeGapsToFetch(
    getCacheState(workspaceId, owner, repo),
    sinceIso,
    currentMonthStartIso
  );

  // 2. Fill each gap (if any) by hitting GitHub and writing to cache.
  for (const gap of gaps) {
    const fetched = await listRepoIssues(octokit, owner, repo, {
      state: "closed",
      since: gap.from,
    });

    // listRepoIssues uses `since` against `updated_at`, so it can return
    // issues closed OUTSIDE the gap window. Filter to the gap's closed_at
    // window before writing to cache.
    const historical = fetched.filter((issue) => {
      if (!issue.closedAt) return false;
      return issue.closedAt >= gap.from && issue.closedAt < gap.to;
    });
    upsertCachedClosedIssues(workspaceId, owner, repo, historical);
  }

  // 3. Update cache state to reflect the newly covered window.
  if (gaps.length > 0) {
    const existing = getCacheState(workspaceId, owner, repo);
    const newStart = existing
      ? minIso(existing.cache_start, sinceIso)
      : sinceIso;
    setCacheState({
      workspace_id: workspaceId,
      repo_owner: owner,
      repo_name: repo,
      cache_start: newStart,
      cache_end: currentMonthStartIso,
      last_synced_at: now.toISOString(),
    });
  }

  // 4. Read the historical slice from cache.
  const historical = getCachedClosedIssuesInRange(
    workspaceId,
    owner,
    repo,
    sinceIso,
    currentMonthStartIso
  );

  // 5. Fetch the current month fresh.
  const currentMonth = await listRepoIssues(octokit, owner, repo, {
    state: "closed",
    since: currentMonthStartIso,
  });

  // 6. Merge, deduping by issue number — the fresh current-month result
  //    wins if an issue was re-opened and re-closed.
  const byNumber = new Map<number, NormalizedIssue>();
  for (const issue of historical) byNumber.set(issue.number, issue);
  for (const issue of currentMonth) byNumber.set(issue.number, issue);
  return [...byNumber.values()];
}

/**
 * Given the current cache state, the requested `since`, and the current
 * month start, return the list of [from, to) windows that must be fetched
 * from GitHub to bring the cache in line.
 */
function computeGapsToFetch(
  state: {
    cache_start: string;
    cache_end: string;
  } | null,
  sinceIso: string,
  currentMonthStartIso: string
): Gap[] {
  // Nothing historical to cache — the request is entirely within the
  // current month, caller can handle it directly.
  if (sinceIso >= currentMonthStartIso) return [];

  // Cold cache: fetch the full historical window in one go.
  if (!state) {
    return [{ from: sinceIso, to: currentMonthStartIso }];
  }

  const gaps: Gap[] = [];

  // Extend coverage backward if the caller asks for older data than we
  // have cached.
  if (sinceIso < state.cache_start) {
    gaps.push({ from: sinceIso, to: state.cache_start });
  }

  // Extend coverage forward — a new month has rolled over since the last
  // sync, lock in the just-ended months.
  if (state.cache_end < currentMonthStartIso) {
    gaps.push({ from: state.cache_end, to: currentMonthStartIso });
  }

  return gaps;
}

function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

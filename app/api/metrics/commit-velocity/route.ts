import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { isRepoTracked } from "@/lib/db/tracked-repos";
import {
  getBuckets,
  getCacheState,
  ensureCacheState,
} from "@/lib/db/repo-commits-cache";
import {
  isSyncInFlight,
  syncSeriesA,
  syncSeriesB,
} from "@/lib/agents/cached-commits";
import { getRepoMetadata } from "@/lib/github/commits";
import { setRepoCreatedAt } from "@/lib/db/repo-commits-cache";
import type {
  CommitVelocityBucketSize,
  CommitVelocityResponse,
  SeriesSyncStatus,
} from "@/types/github";

const DAY_MS = 86_400_000;
/** Don't re-kick a series sync within this window of its last completion. */
const RESYNC_INTERVAL_MS = 60_000;

function isRecent(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < RESYNC_INTERVAL_MS;
}

function pickBucket(fromIso: string, toIso: string): CommitVelocityBucketSize {
  const days = (new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS;
  if (days <= 90) return "day";
  if (days <= 730) return "week";
  return "month";
}

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    if (!owner || !repo) {
      return NextResponse.json(
        { error: "Missing owner or repo" },
        { status: 400 }
      );
    }
    if (!isRepoTracked(workspace.id, owner, repo)) {
      return NextResponse.json(
        { error: "Repository is not tracked in this workspace" },
        { status: 403 }
      );
    }

    const octokit = getOctokit(session.accessToken);
    ensureCacheState(workspace.id, owner, repo);
    let state = getCacheState(workspace.id, owner, repo);

    // Resolve repo creation timestamp once so the client can offer a
    // "since repo creation" preset without an extra round trip.
    if (!state?.repo_created_at) {
      try {
        const meta = await getRepoMetadata(octokit, owner, repo);
        setRepoCreatedAt(workspace.id, owner, repo, meta.createdAt);
        state = getCacheState(workspace.id, owner, repo);
      } catch (error) {
        console.error("[commit-velocity] getRepoMetadata failed:", error);
      }
    }

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const fromIso =
      fromParam ??
      state?.repo_created_at ??
      new Date(Date.now() - 365 * DAY_MS).toISOString();
    const toIso = toParam ?? new Date().toISOString();
    const bucket =
      (searchParams.get("bucket") as CommitVelocityBucketSize | null) ??
      pickBucket(fromIso, toIso);
    const excludeMerges = searchParams.get("excludeMerges") === "1";

    // Trigger Series A: cold backfill is fire-and-forget; warm incremental
    // syncs run inline but are gated by RESYNC_INTERVAL_MS so polling refetches
    // don't hit GitHub on every tick.
    const aRecent = isRecent(state?.series_a_last_synced_at);
    if (state?.series_a_last_synced_at) {
      if (!state.series_a_in_progress && !aRecent) {
        try {
          await syncSeriesA(octokit, workspace.id, owner, repo);
          state = getCacheState(workspace.id, owner, repo);
        } catch (error) {
          console.error("[commit-velocity] inline Series A failed:", error);
        }
      }
    } else if (!state?.series_a_in_progress) {
      void syncSeriesA(octokit, workspace.id, owner, repo);
    }

    // Trigger Series B fire-and-forget. Once backfill is done, gate by
    // RESYNC_INTERVAL_MS so polling refetches don't reset progress counters
    // and re-walk the PR listing every 5s.
    const bRecent = isRecent(state?.series_b_last_synced_at);
    if (!state?.series_b_in_progress && !bRecent) {
      void syncSeriesB(octokit, workspace.id, owner, repo);
    }

    state = getCacheState(workspace.id, owner, repo);

    const buckets = getBuckets(
      workspace.id,
      owner,
      repo,
      fromIso,
      toIso,
      bucket,
      { excludeMerges }
    );

    const seriesA: SeriesSyncStatus = {
      lastSyncedAt: state?.series_a_last_synced_at ?? null,
      inProgress:
        Boolean(state?.series_a_in_progress) ||
        isSyncInFlight(workspace.id, owner, repo, "a"),
      progressSeen: state?.series_a_progress_seen ?? 0,
      lastError: state?.series_a_last_error ?? null,
    };
    const seriesB: SeriesSyncStatus = {
      lastSyncedAt: state?.series_b_last_synced_at ?? null,
      inProgress:
        Boolean(state?.series_b_in_progress) ||
        isSyncInFlight(workspace.id, owner, repo, "b"),
      progressSeen: state?.series_b_progress_seen ?? 0,
      progressTotal: state?.series_b_progress_total ?? null,
      backfillDone: Boolean(state?.series_b_backfill_done),
      lastError: state?.series_b_last_error ?? null,
    };

    const body: CommitVelocityResponse = {
      repo: {
        owner,
        name: repo,
        createdAt: state?.repo_created_at ?? null,
      },
      range: { from: fromIso, to: toIso, bucket },
      buckets,
      syncStatus: { seriesA, seriesB },
    };

    return NextResponse.json(body);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[commit-velocity] route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

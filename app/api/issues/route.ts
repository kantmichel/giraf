import { NextResponse } from "next/server";
import { startOfMonth } from "date-fns";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { listRepoIssues, syncClosedStatusLabels, syncClaudeStatusLabels } from "@/lib/github/issues";
import { listRepoReleases, enrichIssuesWithVersions } from "@/lib/github/releases";
import { detectClosedNotifications } from "@/lib/detect-closed-notifications";
import { fetchClosedIssuesWithCache } from "@/lib/agents/cached-closed-issues";
import type { NormalizedIssue } from "@/types/github";

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const trackedRepos = getTrackedRepos(workspace.id);

    if (trackedRepos.length === 0) {
      return NextResponse.json({
        issues: [],
        errors: [],
        totalRepos: 0,
        fetchedRepos: 0,
      });
    }

    const { searchParams } = new URL(request.url);
    const state = (searchParams.get("state") as "open" | "closed" | "all") || "open";
    const since = searchParams.get("since") || undefined;
    const octokit = getOctokit(session.accessToken);

    // When fetching closed issues with a `since` older than the current
    // month start, use the persistent SQLite cache so only the current
    // month hits the GitHub API on each request.
    const currentMonthStartIso = startOfMonth(new Date()).toISOString();
    const useClosedCache =
      state === "closed" && !!since && since < currentMonthStartIso;

    const results = await Promise.allSettled(
      trackedRepos.map((repo) => {
        if (useClosedCache && since) {
          return fetchClosedIssuesWithCache(
            octokit,
            workspace.id,
            repo.owner,
            repo.repo,
            new Date(since)
          );
        }
        return listRepoIssues(octokit, repo.owner, repo.repo, { state, since });
      })
    );

    const issues: NormalizedIssue[] = [];
    const errors: { repo: string; error: string }[] = [];

    results.forEach((result, i) => {
      const repo = trackedRepos[i];
      if (result.status === "fulfilled") {
        issues.push(...result.value);
      } else {
        errors.push({
          repo: `${repo.owner}/${repo.repo}`,
          error: result.reason?.message || "Unknown error",
        });
      }
    });

    // Enrich closed issues with release version
    const releaseResults = await Promise.allSettled(
      trackedRepos.map((repo) => listRepoReleases(octokit, repo.owner, repo.repo))
    );
    const allReleases = releaseResults.flatMap((r) => r.status === "fulfilled" ? r.value : []);
    enrichIssuesWithVersions(issues, allReleases);

    // Auto-fix closed issues missing "status: done" label (fire-and-forget)
    syncClosedStatusLabels(octokit, issues);

    // Auto-sync status based on Claude AI state (fire-and-forget)
    syncClaudeStatusLabels(octokit, issues);

    // Detect newly closed issues for notifications
    detectClosedNotifications(workspace.id, session.user.githubUsername, issues);

    return NextResponse.json({
      issues,
      errors,
      totalRepos: trackedRepos.length,
      fetchedRepos: trackedRepos.length - errors.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

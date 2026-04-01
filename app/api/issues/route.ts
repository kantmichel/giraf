import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { listRepoIssues, syncClosedStatusLabels } from "@/lib/github/issues";
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

    const results = await Promise.allSettled(
      trackedRepos.map((repo) =>
        listRepoIssues(octokit, repo.owner, repo.repo, { state, since })
      )
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

    // Auto-fix closed issues missing "status: done" label (fire-and-forget)
    syncClosedStatusLabels(octokit, issues);

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

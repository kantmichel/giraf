import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { getTriagedKeys } from "@/lib/db/triage";
import { listRepoIssues } from "@/lib/github/issues";
import type { NormalizedIssue } from "@/types/github";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const trackedRepos = getTrackedRepos(workspace.id);

    if (trackedRepos.length === 0) {
      return NextResponse.json({ issues: [], count: 0 });
    }

    const octokit = getOctokit(session.accessToken);
    const triagedKeys = getTriagedKeys(workspace.id);

    const results = await Promise.allSettled(
      trackedRepos.map((repo) =>
        listRepoIssues(octokit, repo.owner, repo.repo, { state: "open" })
      )
    );

    const allIssues: NormalizedIssue[] = [];
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        allIssues.push(...result.value);
      }
    });

    const untriaged = allIssues.filter((issue) => {
      // Already triaged in Giraf
      if (triagedKeys.has(`${issue.repo.fullName}:${issue.number}`)) return false;
      // Auto-skip: has both a priority/status label AND an assignee
      if ((issue.status || issue.priority) && issue.assignees.length > 0) return false;
      return true;
    });

    // Sort newest first
    untriaged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ issues: untriaged, count: untriaged.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

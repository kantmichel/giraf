import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { getTriagedKeys } from "@/lib/db/triage";
import { listRepoIssues } from "@/lib/github/issues";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const trackedRepos = getTrackedRepos(workspace.id);

    if (trackedRepos.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const octokit = getOctokit(session.accessToken);
    const triagedKeys = getTriagedKeys(workspace.id);

    const results = await Promise.allSettled(
      trackedRepos.map((repo) =>
        listRepoIssues(octokit, repo.owner, repo.repo, { state: "open" })
      )
    );

    let totalIssues = 0;
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        totalIssues += result.value.filter((issue) => {
          if (triagedKeys.has(`${issue.repo.fullName}:${issue.number}`)) return false;
          if ((issue.status || issue.priority) && issue.assignees.length > 0) return false;
          return true;
        }).length;
      }
    });

    return NextResponse.json({ count: totalIssues });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos, addTrackedRepo } from "@/lib/db/tracked-repos";
import { ensureGiraLabels } from "@/lib/github/labels";
import { GitHubApiError } from "@/lib/github/errors";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repos = getTrackedRepos(workspace.id);
    return NextResponse.json(repos);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const octokit = getOctokit(session.accessToken);
    const { owner, repo } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json(
        { error: "owner and repo are required" },
        { status: 400 }
      );
    }

    // Verify the user has access to this repo
    try {
      await octokit.rest.repos.get({ owner, repo });
    } catch {
      return NextResponse.json(
        { error: "Repository not found or no access" },
        { status: 404 }
      );
    }

    const trackedRepo = addTrackedRepo(
      workspace.id,
      owner,
      repo,
      session.user.githubId
    );

    // Auto-create status + priority labels
    const labelResult = await ensureGiraLabels(octokit, owner, repo);

    return NextResponse.json({ repo: trackedRepo, labels: labelResult });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

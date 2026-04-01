import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { watchIssue, unwatchIssue, isWatching } from "@/lib/db/watched-issues";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const watching = isWatching(
      workspace.id,
      session.user.githubUsername,
      `${owner}/${repo}`,
      parseInt(number, 10)
    );
    return NextResponse.json({ watching });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repoFullName = `${owner}/${repo}`;
    const issueNumber = parseInt(number, 10);
    const username = session.user.githubUsername;

    const currentlyWatching = isWatching(workspace.id, username, repoFullName, issueNumber);

    if (currentlyWatching) {
      unwatchIssue(workspace.id, username, repoFullName, issueNumber);
    } else {
      watchIssue(workspace.id, username, repoFullName, issueNumber);
    }

    return NextResponse.json({ watching: !currentlyWatching });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { snoozeIssue, unsnoozeIssue } from "@/lib/db/snooze";
import { setTriageState } from "@/lib/db/triage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const issueNumber = parseInt(number, 10);
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repoFullName = `${owner}/${repo}`;
    const body = await request.json();

    snoozeIssue(
      workspace.id,
      repoFullName,
      issueNumber,
      session.user.githubId,
      body.until || null,
      body.wakeOnActivity !== false
    );
    setTriageState(workspace.id, repoFullName, issueNumber, "snoozed", session.user.githubId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const issueNumber = parseInt(number, 10);
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repoFullName = `${owner}/${repo}`;

    unsnoozeIssue(workspace.id, repoFullName, issueNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

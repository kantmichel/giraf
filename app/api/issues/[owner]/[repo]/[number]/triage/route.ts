import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { setTriageState } from "@/lib/db/triage";
import { snoozeIssue } from "@/lib/db/snooze";
import { getIssue, updateIssue } from "@/lib/github/issues";
import { GitHubApiError } from "@/lib/github/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const issueNumber = parseInt(number, 10);
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const octokit = getOctokit(session.accessToken);
    const repoFullName = `${owner}/${repo}`;

    const body = await request.json();
    const { action, priority, assignees, snoozedUntil, wakeOnActivity } = body;

    switch (action) {
      case "accept": {
        setTriageState(workspace.id, repoFullName, issueNumber, "accepted", session.user.githubId);

        // Only update labels/assignees if explicitly provided
        const updates: { labels?: string[]; assignees?: string[] } = {};

        if (priority) {
          // Get current issue to preserve existing labels
          const currentIssue = await getIssue(octokit, owner, repo, issueNumber);
          const otherLabels = currentIssue.labels
            .map((l) => l.name)
            .filter((l) => !l.startsWith("priority: "));
          updates.labels = [...otherLabels, `priority: ${priority}`];
        }

        if (assignees && assignees.length > 0) {
          updates.assignees = assignees;
        }

        if (Object.keys(updates).length > 0) {
          await updateIssue(octokit, owner, repo, issueNumber, updates);
        }

        return NextResponse.json({ success: true, action: "accepted" });
      }

      case "decline": {
        setTriageState(workspace.id, repoFullName, issueNumber, "declined", session.user.githubId);
        await updateIssue(octokit, owner, repo, issueNumber, { state: "closed" });
        return NextResponse.json({ success: true, action: "declined" });
      }

      case "snooze": {
        setTriageState(workspace.id, repoFullName, issueNumber, "snoozed", session.user.githubId);
        snoozeIssue(
          workspace.id,
          repoFullName,
          issueNumber,
          session.user.githubId,
          snoozedUntil || null,
          wakeOnActivity !== false
        );
        return NextResponse.json({ success: true, action: "snoozed" });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
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

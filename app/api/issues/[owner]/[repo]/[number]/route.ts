import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getIssue, updateIssue } from "@/lib/github/issues";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { checkAndPromote } from "@/lib/priority-escalation";
import { GitHubApiError } from "@/lib/github/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);
    const issue = await getIssue(octokit, owner, repo, parseInt(number, 10));
    return NextResponse.json(issue);
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    let updates = await request.json();

    // Auto-set "status: done" when closing an issue
    if (updates.state === "closed") {
      let labels: string[] = updates.labels;
      if (!labels) {
        const current = await getIssue(octokit, owner, repo, parseInt(number, 10));
        labels = current.labels.map((l: { name: string }) => l.name);
      }
      const hasStatusDone = labels.some((l: string) => l === "status: done");
      if (!hasStatusDone) {
        updates = {
          ...updates,
          labels: [
            ...labels.filter((l: string) => !l.startsWith("status: ")),
            "status: done",
          ],
        };
      }
    }

    // Auto-sync status based on Claude AI state transitions
    if (updates.labels) {
      const labels: string[] = updates.labels;
      const claudeStatusMap: Record<string, string> = {
        "claude-review-start": "status: doing",
        "claude-reviewing": "status: doing",
        "claude-review-done": "status: in review",
        "claude-start": "status: doing",
        "claude-working": "status: doing",
        "claude-done": "status: in review",
      };
      for (const label of labels) {
        const targetStatus = claudeStatusMap[label];
        if (targetStatus) {
          updates = {
            ...updates,
            labels: [
              ...labels.filter((l: string) => !l.startsWith("status: ")),
              targetStatus,
            ],
          };
          break;
        }
      }
    }

    const issue = await updateIssue(octokit, owner, repo, parseInt(number, 10), updates);

    // Check for auto-promotion when status changes to "done"
    let promotion = null;
    if (issue.status === "done" && issue.priority) {
      try {
        promotion = await checkAndPromote(octokit, workspace.id, issue);
      } catch {
        // Don't fail the main update if promotion fails
      }
    }

    return NextResponse.json({ ...issue, promotion });
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

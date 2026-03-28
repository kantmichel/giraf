import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { getRecentPromotions } from "@/lib/db/priority-promotions";
import { getBudget } from "@/lib/db/priority-budgets";
import { listRepoIssues } from "@/lib/github/issues";
import type { NormalizedIssue } from "@/types/github";
import { subDays } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const { searchParams } = new URL(request.url);
    const forUser = searchParams.get("user") || session.user.githubUsername;

    // Get recent promotions
    const promotions = getRecentPromotions(workspace.id, 7);

    // Get budget for the selected user
    const budget = getBudget(workspace.id, forUser);

    // Fetch all open issues
    const trackedRepos = getTrackedRepos(workspace.id);
    const octokit = getOctokit(session.accessToken);

    const results = await Promise.allSettled(
      trackedRepos.map((repo) =>
        listRepoIssues(octokit, repo.owner, repo.repo, { state: "open" })
      )
    );

    const allIssues: NormalizedIssue[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") allIssues.push(...r.value);
    });

    // Filter to user's issues
    const userIssues = allIssues.filter((i) =>
      i.assignees.some((a) => a.login === forUser)
    );

    // Group by priority (to-do issues only for budget tracking)
    const todoByPriority: Record<string, NormalizedIssue[]> = {
      critical: [], high: [], medium: [], low: [],
    };
    for (const issue of userIssues) {
      if (issue.priority && (issue.status === "to do" || issue.status === null)) {
        todoByPriority[issue.priority]?.push(issue);
      }
    }

    const counts = {
      critical: todoByPriority.critical.length,
      high: todoByPriority.high.length,
      medium: todoByPriority.medium.length,
      low: todoByPriority.low.length,
    };

    // Over budget with the actual issues
    const overBudget = {
      critical: { over: Math.max(0, counts.critical - budget.critical_max), issues: todoByPriority.critical },
      high: { over: Math.max(0, counts.high - budget.high_max), issues: todoByPriority.high },
      medium: { over: Math.max(0, counts.medium - budget.medium_max), issues: todoByPriority.medium },
    };

    // Stale issues: high/critical in to-do for 14+ days
    const fourteenDaysAgo = subDays(new Date(), 14);
    const staleIssues = userIssues.filter(
      (i) =>
        i.status === "to do" &&
        (i.priority === "critical" || i.priority === "high") &&
        new Date(i.createdAt) < fourteenDaysAgo
    );

    return NextResponse.json({
      promotions,
      budget,
      counts,
      overBudget,
      staleIssues,
      forUser,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

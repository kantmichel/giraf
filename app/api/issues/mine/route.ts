import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { getSnoozedKeys, autoUnsnoozeExpired } from "@/lib/db/snooze";
import { listRepoIssues, syncClosedStatusLabels } from "@/lib/github/issues";
import type { NormalizedIssue } from "@/types/github";
import { subDays } from "date-fns";

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortByPriorityThenUpdated(a: NormalizedIssue, b: NormalizedIssue): number {
  const pa = a.priority ? (PRIORITY_RANK[a.priority] ?? 99) : 99;
  const pb = b.priority ? (PRIORITY_RANK[b.priority] ?? 99) : 99;
  if (pa !== pb) return pa - pb;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const trackedRepos = getTrackedRepos(workspace.id);
    const username = session.user.githubUsername;

    if (trackedRepos.length === 0) {
      return NextResponse.json({ active: [], upNext: [], recentlyCompleted: [], snoozed: [] });
    }

    // Auto-unsnooze expired
    autoUnsnoozeExpired(workspace.id);
    const snoozedKeys = getSnoozedKeys(workspace.id);

    const octokit = getOctokit(session.accessToken);
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    // Fetch open and recently closed issues
    const [openResults, closedResults] = await Promise.all([
      Promise.allSettled(
        trackedRepos.map((repo) =>
          listRepoIssues(octokit, repo.owner, repo.repo, { state: "open" })
        )
      ),
      Promise.allSettled(
        trackedRepos.map((repo) =>
          listRepoIssues(octokit, repo.owner, repo.repo, { state: "closed" })
        )
      ),
    ]);

    const openIssues: NormalizedIssue[] = [];
    openResults.forEach((r) => {
      if (r.status === "fulfilled") openIssues.push(...r.value);
    });

    const closedIssues: NormalizedIssue[] = [];
    closedResults.forEach((r) => {
      if (r.status === "fulfilled") closedIssues.push(...r.value);
    });

    // Auto-fix closed issues missing "status: done" label (fire-and-forget)
    syncClosedStatusLabels(octokit, closedIssues);

    // Filter to my issues
    const myOpen = openIssues.filter((i) =>
      i.assignees.some((a) => a.login === username)
    );
    const myClosed = closedIssues.filter(
      (i) =>
        i.assignees.some((a) => a.login === username) &&
        new Date(i.updatedAt) >= new Date(sevenDaysAgo)
    );

    // Separate snoozed
    const snoozedIssues: NormalizedIssue[] = [];
    const nonSnoozed: NormalizedIssue[] = [];
    for (const issue of myOpen) {
      const key = `${issue.repo.fullName}:${issue.number}`;
      if (snoozedKeys.has(key)) {
        snoozedIssues.push(issue);
      } else {
        nonSnoozed.push(issue);
      }
    }

    // Group by status
    const active = nonSnoozed
      .filter((i) => i.status === "doing" || i.status === "in review")
      .sort(sortByPriorityThenUpdated);

    const upNext = nonSnoozed
      .filter((i) => i.status === "to do" || i.status === null)
      .sort(sortByPriorityThenUpdated);

    const recentlyCompleted = myClosed.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({
      active,
      upNext,
      recentlyCompleted,
      snoozed: snoozedIssues.sort(sortByPriorityThenUpdated),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

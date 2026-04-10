import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { collectAgentPrsForRepo } from "@/lib/agents/collect-agent-prs";
import type { AgentPr, AgentPrSummary } from "@/types/agents";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const trackedRepos = getTrackedRepos(workspace.id);

    if (trackedRepos.length === 0) {
      return NextResponse.json({ prs: [], summary: emptySummary() });
    }

    const octokit = getOctokit(session.accessToken);

    const results = await Promise.allSettled(
      trackedRepos.map((r) =>
        collectAgentPrsForRepo({
          octokit,
          owner: r.owner,
          repo: r.repo,
        })
      )
    );

    const prs: AgentPr[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        prs.push(...result.value);
      }
    }

    // Sort by risk descending
    prs.sort((a, b) => b.riskScore - a.riskScore);

    const summary = computeSummary(prs);

    return NextResponse.json({ prs, summary });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

function emptySummary(): AgentPrSummary {
  return {
    totalOpen: 0,
    avgAgeDays: 0,
    conflicts: 0,
    readyToMerge: 0,
    awaitingReview: 0,
    stale: 0,
  };
}

function computeSummary(prs: AgentPr[]): AgentPrSummary {
  if (prs.length === 0) return emptySummary();
  let ageSum = 0;
  let conflicts = 0;
  let readyToMerge = 0;
  let awaitingReview = 0;
  let stale = 0;
  for (const pr of prs) {
    ageSum += pr.ageDays;
    if (pr.reasons.includes("conflict")) conflicts++;
    if (pr.reasons.includes("ready-to-merge")) readyToMerge++;
    if (pr.reasons.includes("awaiting-review")) awaitingReview++;
    if (pr.reasons.includes("stale")) stale++;
  }
  return {
    totalOpen: prs.length,
    avgAgeDays: Math.round((ageSum / prs.length) * 10) / 10,
    conflicts,
    readyToMerge,
    awaitingReview,
    stale,
  };
}

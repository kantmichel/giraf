import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { discoverImpactLabels, syncImpactLabel, IMPACT_PREFIX } from "@/lib/github/impact-labels";
import { GitHubApiError } from "@/lib/github/errors";

/** GET — list every `impact: <type>` label across tracked repos, deduped. */
export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repos = getTrackedRepos(workspace.id);
    const octokit = getOctokit(session.accessToken);
    const labels = await discoverImpactLabels(octokit, repos);
    return NextResponse.json({ labels, totalRepos: repos.length });
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

const HEX_RE = /^[0-9a-f]{6}$/i;

/**
 * POST — create-or-sync an `impact: <type>` label across all tracked repos.
 * Body: { type: string, color: string (6-char hex), description?: string }
 * Idempotent: repos that already have the label are skipped.
 */
export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repos = getTrackedRepos(workspace.id);
    const octokit = getOctokit(session.accessToken);

    const body = await request.json();
    const rawType = String(body.type ?? "").trim().toLowerCase();
    const color = String(body.color ?? "").replace(/^#/, "").trim();
    const description = body.description ? String(body.description).trim() : undefined;

    if (!rawType) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(rawType)) {
      return NextResponse.json(
        { error: "type must be lowercase letters, numbers, and hyphens only" },
        { status: 400 }
      );
    }
    if (!HEX_RE.test(color)) {
      return NextResponse.json(
        { error: "color must be a 6-character hex string" },
        { status: 400 }
      );
    }

    const result = await syncImpactLabel(octokit, repos, {
      name: `${IMPACT_PREFIX}${rawType}`,
      color,
      description,
    });

    return NextResponse.json(result);
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

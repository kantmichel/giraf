import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { fetchFeatureProjects, describeGraphqlError } from "@/lib/github/projects";

/**
 * The open org Projects of the tracked repos' owners: the features a month can
 * plan. Read through the same cached call that puts features on issues, so
 * the picker and the board never disagree about what a feature holds. Unlike
 * the board, this says when GitHub refused, because the plan page is useless
 * without Projects and the fix (sign in again) is the person's to make.
 */
export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const owners = Array.from(new Set(getTrackedRepos(workspace.id).map((r) => r.owner)));
    const octokit = getOctokit(session.accessToken);
    const results = await Promise.allSettled(
      owners.map((owner) => fetchFeatureProjects(octokit, owner))
    );
    const projects = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const errors = results.flatMap((r, i) =>
      r.status === "rejected" ? [{ owner: owners[i], error: describeGraphqlError(r.reason) }] : []
    );
    return NextResponse.json({ projects, errors });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

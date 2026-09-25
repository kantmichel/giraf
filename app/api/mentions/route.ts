import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { searchMentions } from "@/lib/github/mention-search";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const octokit = getOctokit(session.accessToken);

    const trackedRepos = getTrackedRepos(workspace.id);
    const tracked = new Set(trackedRepos.map((r) => `${r.owner}/${r.repo}`));
    const owners = new Set(trackedRepos.map((r) => r.owner));

    // Scope the search to the org when every tracked repo shares one, which
    // keeps the 100-result page full of things actually on the board. With
    // several owners the qualifier is dropped and the filter below does the work.
    const org = owners.size === 1 ? [...owners][0] : "";

    const results = await searchMentions(
      octokit,
      session.user.githubUsername,
      org
    );

    return NextResponse.json({
      mentions: results.filter((m) => tracked.has(m.repoFullName)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[mentions] search failed —", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

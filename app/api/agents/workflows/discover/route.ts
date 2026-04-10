import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { listImportedWorkflows } from "@/lib/db/agent-workflows";
import { listRepoWorkflows } from "@/lib/github/workflows";
import type { DiscoveredWorkflowGroup } from "@/types/agents";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const trackedRepos = getTrackedRepos(workspace.id);

    if (trackedRepos.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const octokit = getOctokit(session.accessToken);
    const imported = listImportedWorkflows(workspace.id);
    const importedSet = new Set(
      imported.map((i) => `${i.repo.owner}/${i.repo.name}:${i.workflow.id}`)
    );

    const results = await Promise.allSettled(
      trackedRepos.map(async (r) => {
        const workflows = await listRepoWorkflows(octokit, r.owner, r.repo);
        return {
          repo: { owner: r.owner, name: r.repo },
          workflows: workflows
            .filter((w) => w.state === "active")
            .map((w) => ({
              id: w.id,
              name: w.name,
              path: w.path,
              state: w.state,
              htmlUrl: w.html_url,
              alreadyImported: importedSet.has(`${r.owner}/${r.repo}:${w.id}`),
            })),
        };
      })
    );

    const groups: DiscoveredWorkflowGroup[] = results
      .filter(
        (r): r is PromiseFulfilledResult<DiscoveredWorkflowGroup> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value)
      .filter((g) => g.workflows.length > 0);

    return NextResponse.json({ groups });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

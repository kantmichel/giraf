import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import {
  getImportedWorkflowByGithubId,
  insertImportedWorkflow,
  listImportedWorkflows,
} from "@/lib/db/agent-workflows";
import {
  getWorkflowFileContent,
  listRepoWorkflows,
} from "@/lib/github/workflows";
import { parseWorkflowYaml } from "@/lib/agents/parse-workflow-yaml";
import { syncImportedWorkflowRuns } from "@/lib/agents/sync-workflow-runs";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const imported = listImportedWorkflows(workspace.id);
    return NextResponse.json({ imported });
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

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const body = (await request.json()) as {
      owner?: string;
      repo?: string;
      workflowId?: number;
    };

    const { owner, repo, workflowId } = body;
    if (!owner || !repo || typeof workflowId !== "number") {
      return NextResponse.json(
        { error: "Missing owner, repo, or workflowId" },
        { status: 400 }
      );
    }

    // If already imported, return existing
    const existing = getImportedWorkflowByGithubId(
      workspace.id,
      owner,
      repo,
      workflowId
    );
    if (existing) {
      return NextResponse.json({ imported: existing, alreadyImported: true });
    }

    const octokit = getOctokit(session.accessToken);
    const workflows = await listRepoWorkflows(octokit, owner, repo);
    const workflow = workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const yamlContent = await getWorkflowFileContent(
      octokit,
      owner,
      repo,
      workflow.path
    );

    let parsed;
    try {
      parsed = parseWorkflowYaml(yamlContent);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid workflow YAML" },
        { status: 400 }
      );
    }

    const imported = insertImportedWorkflow({
      workspaceId: workspace.id,
      repoOwner: owner,
      repoName: repo,
      workflowId: workflow.id,
      workflowName: parsed.name || workflow.name,
      workflowPath: workflow.path,
      displayName: null,
      description: null,
      stages: parsed.stages,
      scheduleCrons: parsed.scheduleCrons,
      importedBy: session.user.githubUsername,
    });

    // Fire-and-forget: populate runs for the new workflow
    syncImportedWorkflowRuns(octokit, imported).catch(() => {});

    return NextResponse.json({ imported, alreadyImported: false });
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

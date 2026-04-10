import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import {
  deleteImportedWorkflow,
  getImportedWorkflow,
  updateImportedWorkflow,
} from "@/lib/db/agent-workflows";
import { getWorkflowFileContent } from "@/lib/github/workflows";
import { parseWorkflowYaml } from "@/lib/agents/parse-workflow-yaml";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);

    const existing = getImportedWorkflow(numericId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as {
      displayName?: string | null;
      description?: string | null;
      enabled?: boolean;
      refresh?: boolean;
    };

    if (body.refresh) {
      const octokit = getOctokit(session.accessToken);
      const yamlContent = await getWorkflowFileContent(
        octokit,
        existing.repo.owner,
        existing.repo.name,
        existing.workflow.path
      );
      let parsed;
      try {
        parsed = parseWorkflowYaml(yamlContent);
      } catch (err) {
        return NextResponse.json(
          {
            error: err instanceof Error ? err.message : "Invalid workflow YAML",
          },
          { status: 400 }
        );
      }
      const updated = updateImportedWorkflow(numericId, {
        stages: parsed.stages,
        scheduleCrons: parsed.scheduleCrons,
      });
      return NextResponse.json({ imported: updated });
    }

    const updated = updateImportedWorkflow(numericId, {
      displayName: body.displayName,
      description: body.description,
      enabled: body.enabled,
    });
    return NextResponse.json({ imported: updated });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);

    const existing = getImportedWorkflow(numericId);
    if (!existing || existing.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    deleteImportedWorkflow(numericId);
    return NextResponse.json({ ok: true });
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

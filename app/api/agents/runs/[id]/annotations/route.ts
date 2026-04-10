import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { db } from "@/lib/db";
import { listWorkflowRunAnnotations } from "@/lib/github/workflow-runs";
import type { WorkflowRunRow } from "@/types/agents";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runId = parseInt(id, 10);
    if (isNaN(runId)) {
      return NextResponse.json({ error: "Invalid run id" }, { status: 400 });
    }

    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);

    const row = db
      .prepare(
        "SELECT repo_owner, repo_name FROM workflow_runs WHERE id = ? AND workspace_id = ?"
      )
      .get(runId, workspace.id) as
      | Pick<WorkflowRunRow, "repo_owner" | "repo_name">
      | undefined;

    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const octokit = getOctokit(session.accessToken);
    const annotations = await listWorkflowRunAnnotations(
      octokit,
      row.repo_owner,
      row.repo_name,
      runId
    );

    return NextResponse.json({ annotations });
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

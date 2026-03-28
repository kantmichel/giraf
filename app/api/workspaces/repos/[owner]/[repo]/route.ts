import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { removeTrackedRepo } from "@/lib/db/tracked-repos";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const deleted = removeTrackedRepo(workspace.id, owner, repo);

    if (!deleted) {
      return NextResponse.json({ error: "Repo not tracked" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

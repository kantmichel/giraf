import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getClaudeEnabledRepos, setClaudeEnabled, removeClaudeEnabled } from "@/lib/db/claude-repos";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const repos = getClaudeEnabledRepos(workspace.id);
    return NextResponse.json(repos);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const { owner, repo, enabled } = await request.json();

    if (!owner || !repo) {
      return NextResponse.json({ error: "owner and repo required" }, { status: 400 });
    }

    if (enabled) {
      setClaudeEnabled(workspace.id, owner, repo);
    } else {
      removeClaudeEnabled(workspace.id, owner, repo);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

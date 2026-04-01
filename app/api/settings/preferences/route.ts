import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getUserPreferences, setUserPreferences } from "@/lib/db/user-preferences";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const prefs = getUserPreferences(workspace.id, session.user.githubUsername);
    return NextResponse.json(prefs);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[preferences GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const body = await req.json();
    setUserPreferences(workspace.id, session.user.githubUsername, body);
    const prefs = getUserPreferences(workspace.id, session.user.githubUsername);
    return NextResponse.json(prefs);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[preferences POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

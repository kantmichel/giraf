import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { dismissMention } from "@/lib/db/read-mentions";

/** Hide a mention from the bell. Local only — the mentions page still lists it. */
export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);

    const body = await request.json().catch(() => ({}));
    const mentionId: unknown = body?.mentionId;
    if (typeof mentionId !== "string" || mentionId.length === 0) {
      return NextResponse.json({ error: "mentionId required" }, { status: 400 });
    }

    dismissMention(workspace.id, session.user.githubUsername, mentionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

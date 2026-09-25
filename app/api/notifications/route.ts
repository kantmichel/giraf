import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getUnreadNotifications, getUnreadCount, markAllRead } from "@/lib/db/notifications";
import { listMentions } from "@/lib/github/mentions";
import { getMentionFlags, markMentionsRead } from "@/lib/db/read-mentions";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const username = session.user.githubUsername;

    const notifications = getUnreadNotifications(workspace.id);
    const unreadCount = getUnreadCount(workspace.id);

    // Mentions come straight from GitHub, so a failure here (rate limit, an
    // outage) must not take the bell down with it — the local notifications
    // are still worth showing.
    let mentions: Awaited<ReturnType<typeof listMentions>> = [];
    try {
      const octokit = getOctokit(session.accessToken);
      mentions = await listMentions(octokit);
    } catch (error) {
      console.error(
        "[notifications] mentions unavailable —",
        error instanceof Error ? error.message : error
      );
    }

    // Dismissed mentions drop out of the bell entirely; they remain findable
    // on the mentions page, which reads the full history from GitHub.
    const flags = getMentionFlags(workspace.id, username);
    const withReadState = mentions
      .filter((m) => !flags.get(m.id)?.dismissed)
      .map((m) => ({ ...m, read: flags.get(m.id)?.read ?? false }));

    return NextResponse.json({
      notifications,
      unreadCount,
      mentions: withReadState,
      mentionUnreadCount: withReadState.filter((m) => !m.read).length,
    });
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

    markAllRead(workspace.id);

    // The caller sends the mention ids it is currently showing, so opening the
    // bell only dismisses what was actually on screen.
    const body = await request.json().catch(() => ({}));
    const mentionIds: string[] = Array.isArray(body?.mentionIds)
      ? body.mentionIds
      : [];
    markMentionsRead(workspace.id, session.user.githubUsername, mentionIds);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

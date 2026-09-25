import { db } from "./index";

export interface MentionFlags {
  read: boolean;
  dismissed: boolean;
}

/**
 * Per-thread state for GitHub mentions, keyed by notification thread id.
 *
 * Deliberately local: Gira never marks a notification read on github.com, so
 * acting here cannot clear something from the real inbox before it has been
 * dealt with. The cost is that the two can disagree.
 *
 * `dismissed` only hides a mention from the bell. The mentions page reads the
 * full history from GitHub's search API, so dismissing is never destructive.
 */
export function getMentionFlags(
  workspaceId: string,
  username: string
): Map<string, MentionFlags> {
  const rows = db
    .prepare(
      `SELECT thread_id, dismissed FROM read_mentions
       WHERE workspace_id = ? AND github_username = ?`
    )
    .all(workspaceId, username) as { thread_id: string; dismissed: number }[];

  return new Map(
    rows.map((r) => [r.thread_id, { read: true, dismissed: r.dismissed === 1 }])
  );
}

export function markMentionsRead(
  workspaceId: string,
  username: string,
  threadIds: string[]
): void {
  if (threadIds.length === 0) return;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO read_mentions (workspace_id, github_username, thread_id)
     VALUES (?, ?, ?)`
  );
  const insertAll = db.transaction((ids: string[]) => {
    for (const id of ids) stmt.run(workspaceId, username, id);
  });
  insertAll(threadIds);
}

export function dismissMention(
  workspaceId: string,
  username: string,
  threadId: string
): void {
  db.prepare(
    `INSERT INTO read_mentions (workspace_id, github_username, thread_id, dismissed)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(workspace_id, github_username, thread_id)
     DO UPDATE SET dismissed = 1`
  ).run(workspaceId, username, threadId);
}

import { db } from "./index";

/**
 * Which GitHub mention threads this user has dismissed in Gira.
 *
 * Deliberately local: Gira never marks a notification read on github.com, so
 * dismissing something here cannot clear it from the real inbox before it has
 * actually been dealt with. The cost is that the two can disagree.
 */
export function getReadMentionIds(
  workspaceId: string,
  username: string
): Set<string> {
  const rows = db
    .prepare(
      "SELECT thread_id FROM read_mentions WHERE workspace_id = ? AND github_username = ?"
    )
    .all(workspaceId, username) as { thread_id: string }[];
  return new Set(rows.map((r) => r.thread_id));
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

/**
 * Drop rows for threads GitHub no longer returns, so the table cannot grow
 * without bound as old notifications age out of the API window.
 */
export function pruneReadMentions(
  workspaceId: string,
  username: string,
  liveThreadIds: string[]
): void {
  if (liveThreadIds.length === 0) return;
  const placeholders = liveThreadIds.map(() => "?").join(",");
  db.prepare(
    `DELETE FROM read_mentions
     WHERE workspace_id = ? AND github_username = ?
       AND thread_id NOT IN (${placeholders})`
  ).run(workspaceId, username, ...liveThreadIds);
}

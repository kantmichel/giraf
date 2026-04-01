import { db } from "./index";

export interface ClosedNotificationRow {
  id: number;
  workspace_id: string;
  repo_full_name: string;
  issue_number: number;
  issue_title: string;
  issue_html_url: string;
  closed_at: string;
  read: number;
  created_at: string;
}

export function insertClosedNotification(
  workspaceId: string,
  data: {
    repoFullName: string;
    issueNumber: number;
    issueTitle: string;
    issueHtmlUrl: string;
    closedAt: string;
  }
): void {
  db.prepare(
    `INSERT OR IGNORE INTO closed_notifications
     (workspace_id, repo_full_name, issue_number, issue_title, issue_html_url, closed_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    workspaceId,
    data.repoFullName,
    data.issueNumber,
    data.issueTitle,
    data.issueHtmlUrl,
    data.closedAt
  );
}

export function getUnreadNotifications(workspaceId: string): ClosedNotificationRow[] {
  return db
    .prepare(
      "SELECT * FROM closed_notifications WHERE workspace_id = ? AND read = 0 ORDER BY closed_at DESC"
    )
    .all(workspaceId) as ClosedNotificationRow[];
}

export function getUnreadCount(workspaceId: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM closed_notifications WHERE workspace_id = ? AND read = 0"
    )
    .get(workspaceId) as { count: number };
  return row.count;
}

export function markAllRead(workspaceId: string): void {
  db.prepare(
    "UPDATE closed_notifications SET read = 1 WHERE workspace_id = ? AND read = 0"
  ).run(workspaceId);
}

export function cleanupOldNotifications(workspaceId: string): void {
  db.prepare(
    "DELETE FROM closed_notifications WHERE workspace_id = ? AND read = 1 AND created_at < datetime('now', '-30 days')"
  ).run(workspaceId);
}

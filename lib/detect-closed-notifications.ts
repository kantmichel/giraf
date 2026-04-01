import { insertClosedNotification, cleanupOldNotifications } from "@/lib/db/notifications";
import { getWatchedKeys } from "@/lib/db/watched-issues";
import type { NormalizedIssue } from "@/types/github";

export function detectClosedNotifications(
  workspaceId: string,
  username: string,
  issues: NormalizedIssue[]
): void {
  const watchedKeys = getWatchedKeys(workspaceId, username);

  const relevant = issues.filter((i) => {
    if (i.state !== "closed") return false;
    // Notify for issues user created, is assigned to, or is watching
    return (
      i.createdBy.login === username ||
      i.assignees.some((a) => a.login === username) ||
      watchedKeys.has(`${i.repo.fullName}:${i.number}`)
    );
  });

  for (const issue of relevant) {
    insertClosedNotification(workspaceId, {
      repoFullName: issue.repo.fullName,
      issueNumber: issue.number,
      issueTitle: issue.title,
      issueHtmlUrl: issue.htmlUrl,
      closedAt: issue.closedAt || issue.updatedAt,
    });
  }

  // Prune old read notifications periodically
  cleanupOldNotifications(workspaceId);
}

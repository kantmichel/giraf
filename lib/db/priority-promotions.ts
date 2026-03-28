import { db } from "./index";

export interface PriorityPromotion {
  id: number;
  workspace_id: string;
  repo_full_name: string;
  issue_number: number;
  from_priority: string;
  to_priority: string;
  triggered_by_repo: string;
  triggered_by_issue: number;
  promoted_at: string;
}

export function logPromotion(
  workspaceId: string,
  repoFullName: string,
  issueNumber: number,
  fromPriority: string,
  toPriority: string,
  triggeredByRepo: string,
  triggeredByIssue: number
): number {
  const result = db.prepare(
    `INSERT INTO priority_promotions
     (workspace_id, repo_full_name, issue_number, from_priority, to_priority, triggered_by_repo, triggered_by_issue)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    workspaceId,
    repoFullName,
    issueNumber,
    fromPriority,
    toPriority,
    triggeredByRepo,
    triggeredByIssue
  );
  return Number(result.lastInsertRowid);
}

export function getRecentPromotions(
  workspaceId: string,
  days: number = 7
): PriorityPromotion[] {
  return db
    .prepare(
      `SELECT * FROM priority_promotions
       WHERE workspace_id = ? AND promoted_at > datetime('now', '-' || ? || ' days')
       ORDER BY promoted_at DESC`
    )
    .all(workspaceId, days) as PriorityPromotion[];
}

export function deletePromotion(id: number): boolean {
  const result = db
    .prepare("DELETE FROM priority_promotions WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function getPromotion(id: number): PriorityPromotion | undefined {
  return db
    .prepare("SELECT * FROM priority_promotions WHERE id = ?")
    .get(id) as PriorityPromotion | undefined;
}

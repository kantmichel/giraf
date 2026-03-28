import { db } from "./index";

export interface PriorityBudget {
  workspace_id: string;
  github_user_id: string;
  critical_max: number;
  high_max: number;
  medium_max: number;
}

const DEFAULT_BUDGET = { critical_max: 2, high_max: 3, medium_max: 5 };

export function getBudget(
  workspaceId: string,
  githubUserId: string
): PriorityBudget {
  const row = db
    .prepare(
      "SELECT * FROM priority_budgets WHERE workspace_id = ? AND github_user_id = ?"
    )
    .get(workspaceId, githubUserId) as PriorityBudget | undefined;

  return row ?? {
    workspace_id: workspaceId,
    github_user_id: githubUserId,
    ...DEFAULT_BUDGET,
  };
}

export function setBudget(
  workspaceId: string,
  githubUserId: string,
  budget: { critical_max: number; high_max: number; medium_max: number }
): void {
  db.prepare(
    `INSERT INTO priority_budgets (workspace_id, github_user_id, critical_max, high_max, medium_max)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, github_user_id)
     DO UPDATE SET critical_max = ?, high_max = ?, medium_max = ?`
  ).run(
    workspaceId,
    githubUserId,
    budget.critical_max,
    budget.high_max,
    budget.medium_max,
    budget.critical_max,
    budget.high_max,
    budget.medium_max
  );
}

export function getAllBudgets(workspaceId: string): PriorityBudget[] {
  return db
    .prepare("SELECT * FROM priority_budgets WHERE workspace_id = ?")
    .all(workspaceId) as PriorityBudget[];
}

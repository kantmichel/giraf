import { db } from "./index";
import { parseMonthPlan, type MonthPlan } from "@/lib/month-plan";

interface Row {
  plan_json: string;
}

function parseRows(rows: Row[]): MonthPlan[] {
  const plans: MonthPlan[] = [];
  for (const row of rows) {
    try {
      const plan = parseMonthPlan(JSON.parse(row.plan_json));
      if (plan) plans.push(plan);
    } catch {
      // A corrupted row is skipped rather than breaking every plan.
    }
  }
  return plans;
}

/** Every plan in the workspace, oldest month first. */
export function listMonthPlans(workspaceId: string): MonthPlan[] {
  const rows = db
    .prepare("SELECT plan_json FROM month_plans WHERE workspace_id = ? ORDER BY month, person")
    .all(workspaceId) as Row[];
  return parseRows(rows);
}

export function saveMonthPlan(workspaceId: string, plan: MonthPlan): void {
  db.prepare(
    `INSERT INTO month_plans (workspace_id, person, month, plan_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, person, month)
     DO UPDATE SET plan_json = excluded.plan_json, updated_at = excluded.updated_at`
  ).run(workspaceId, plan.person, plan.month, JSON.stringify(plan), plan.updatedAt);
}

export function deleteMonthPlan(workspaceId: string, person: string, month: string): void {
  db.prepare("DELETE FROM month_plans WHERE workspace_id = ? AND person = ? AND month = ?").run(
    workspaceId,
    person,
    month
  );
}

/**
 * An import replaces every plan of that person, in one transaction. No
 * merging: the file is the plan's owner's copy, and a merge would invent a
 * version neither side agreed to.
 */
export function replaceMonthPlans(workspaceId: string, person: string, plans: MonthPlan[]): void {
  db.transaction(() => {
    db.prepare("DELETE FROM month_plans WHERE workspace_id = ? AND person = ?").run(workspaceId, person);
    for (const plan of plans) saveMonthPlan(workspaceId, plan);
  })();
}

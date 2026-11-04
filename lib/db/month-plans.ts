import { db } from "./index";
import { parseMonthPlan, parsePlanMonth, type MonthPlan, type PlanMonth } from "@/lib/month-plan";

function parseRows<T>(rows: { json: string }[], parse: (raw: unknown) => T | null): T[] {
  const out: T[] = [];
  for (const row of rows) {
    try {
      const value = parse(JSON.parse(row.json));
      if (value) out.push(value);
    } catch {
      // A corrupted row is skipped rather than breaking every plan.
    }
  }
  return out;
}

/** Every plan in the workspace, oldest month first. */
export function listMonthPlans(workspaceId: string): MonthPlan[] {
  const rows = db
    .prepare("SELECT plan_json AS json FROM month_plans WHERE workspace_id = ? ORDER BY month, person")
    .all(workspaceId) as { json: string }[];
  return parseRows(rows, parseMonthPlan);
}

/** Every planned month in the workspace, oldest first. */
export function listPlanMonths(workspaceId: string): PlanMonth[] {
  const rows = db
    .prepare("SELECT month_json AS json FROM plan_months WHERE workspace_id = ? ORDER BY month")
    .all(workspaceId) as { json: string }[];
  return parseRows(rows, parsePlanMonth);
}

function saveMonthPlan(workspaceId: string, plan: MonthPlan): void {
  db.prepare(
    `INSERT INTO month_plans (workspace_id, person, month, plan_json, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, person, month)
     DO UPDATE SET plan_json = excluded.plan_json, updated_at = excluded.updated_at`
  ).run(workspaceId, plan.person, plan.month, JSON.stringify(plan), plan.updatedAt);
}

function savePlanMonth(workspaceId: string, month: PlanMonth): void {
  db.prepare(
    `INSERT INTO plan_months (workspace_id, month, month_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(workspace_id, month)
     DO UPDATE SET month_json = excluded.month_json, updated_at = excluded.updated_at`
  ).run(workspaceId, month.month, JSON.stringify(month), month.updatedAt);
}

/** Plans and months in one transaction: planning a month writes a plan per
 *  person and the month together, and half of that would be a different plan. */
export function savePlans(workspaceId: string, plans: MonthPlan[], months: PlanMonth[]): void {
  db.transaction(() => {
    for (const plan of plans) saveMonthPlan(workspaceId, plan);
    for (const month of months) savePlanMonth(workspaceId, month);
  })();
}

export function deleteMonthPlan(workspaceId: string, person: string, month: string): void {
  db.prepare("DELETE FROM month_plans WHERE workspace_id = ? AND person = ? AND month = ?").run(
    workspaceId,
    person,
    month
  );
}

/**
 * An import replaces every plan and month, in one transaction. No merging:
 * the file is the planner's copy, and a merge would invent a version neither
 * side agreed to.
 */
export function replaceAllPlans(workspaceId: string, plans: MonthPlan[], months: PlanMonth[]): void {
  db.transaction(() => {
    db.prepare("DELETE FROM month_plans WHERE workspace_id = ?").run(workspaceId);
    db.prepare("DELETE FROM plan_months WHERE workspace_id = ?").run(workspaceId);
    savePlans(workspaceId, plans, months);
  })();
}

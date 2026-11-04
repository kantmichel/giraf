import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { listMonthPlans, listPlanMonths, savePlans, deleteMonthPlan } from "@/lib/db/month-plans";
import { isMonth, parseMonthPlan, parsePlanMonth, type MonthPlan, type PlanMonth } from "@/lib/month-plan";

function failure(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Every person's month plans, and every planned month, in the workspace. */
export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    return NextResponse.json({ plans: listMonthPlans(workspace.id), months: listPlanMonths(workspace.id) });
  } catch (error) {
    return failure(error);
  }
}

/** Save plans and months together: `{ plans: [...], months: [...] }`. The
 *  server stamps updatedAt, so the time shown on the page is when it was
 *  stored, not the browser's clock. Nothing is saved if one is unusable. */
export async function PUT(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const body = (await request.json()) as { plans?: unknown[]; months?: unknown[] };
    const rawPlans = Array.isArray(body.plans) ? body.plans : [];
    const rawMonths = Array.isArray(body.months) ? body.months : [];
    const plans = rawPlans.map(parseMonthPlan);
    const months = rawMonths.map(parsePlanMonth);
    if (plans.some((p) => !p) || months.some((m) => !m)) {
      return NextResponse.json(
        { error: "A plan needs a person and a month, a month needs a month (YYYY-MM)" },
        { status: 400 }
      );
    }
    const now = new Date().toISOString();
    const saved = {
      plans: (plans as MonthPlan[]).map((p) => ({ ...p, updatedAt: now })),
      months: (months as PlanMonth[]).map((m) => ({ ...m, updatedAt: now })),
    };
    savePlans(workspace.id, saved.plans, saved.months);
    return NextResponse.json(saved);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const { searchParams } = new URL(request.url);
    const person = searchParams.get("person");
    const month = searchParams.get("month");
    if (!person || !isMonth(month)) {
      return NextResponse.json({ error: "person and month (YYYY-MM) required" }, { status: 400 });
    }
    deleteMonthPlan(workspace.id, person, month);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

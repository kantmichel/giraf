import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { listMonthPlans, saveMonthPlan, deleteMonthPlan } from "@/lib/db/month-plans";
import { isMonth, parseMonthPlan } from "@/lib/month-plan";

function failure(error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/** Every month plan in the workspace. */
export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    return NextResponse.json({ plans: listMonthPlans(workspace.id) });
  } catch (error) {
    return failure(error);
  }
}

/** Save one month plan. The server stamps updatedAt, so the time shown on
 *  the page is when it was stored, not the browser's clock. */
export async function PUT(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const plan = parseMonthPlan(await request.json());
    if (!plan) {
      return NextResponse.json({ error: "A plan needs a person and a month (YYYY-MM)" }, { status: 400 });
    }
    plan.updatedAt = new Date().toISOString();
    saveMonthPlan(workspace.id, plan);
    return NextResponse.json({ plan });
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

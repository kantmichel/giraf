import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { getBudget, setBudget, getAllBudgets } from "@/lib/db/priority-budgets";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const budgets = getAllBudgets(workspace.id);
    return NextResponse.json(budgets);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const { githubUserId, critical_max, high_max, medium_max } = await request.json();

    if (!githubUserId) {
      return NextResponse.json({ error: "githubUserId required" }, { status: 400 });
    }

    setBudget(workspace.id, githubUserId, { critical_max, high_max, medium_max });
    const budget = getBudget(workspace.id, githubUserId);
    return NextResponse.json(budget);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

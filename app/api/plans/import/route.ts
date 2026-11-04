import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/db/workspace-helpers";
import { replaceAllPlans } from "@/lib/db/month-plans";
import { parsePlanExport } from "@/lib/month-plan";

/**
 * Replace every plan and month with the ones in an exported file.
 *
 * This is the second way plans reach an instance, next to editing them here.
 * It exists because each person runs Gira on their own machine with their own
 * database, and the plan holds hours that should not be written to GitHub.
 */
export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const workspace = getWorkspaceForUser(session.user.githubUsername);
    const file = parsePlanExport(await request.json());
    if (!file) {
      return NextResponse.json(
        { error: "This is not a Gira plan export, or one from an older Gira: ask for a new export" },
        { status: 400 }
      );
    }
    replaceAllPlans(workspace.id, file.plans, file.months);
    return NextResponse.json({ plans: file.plans.length, months: file.months.length });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "The file is not valid JSON" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

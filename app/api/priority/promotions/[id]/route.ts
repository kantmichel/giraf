import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getPromotion, deletePromotion } from "@/lib/db/priority-promotions";
import { updateIssue } from "@/lib/github/issues";
import { GitHubApiError } from "@/lib/github/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const promotionId = parseInt(id, 10);
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);

    const promotion = getPromotion(promotionId);
    if (!promotion) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    // Revert the priority on GitHub
    const [owner, repo] = promotion.repo_full_name.split("/");
    const issue = await updateIssue(octokit, owner, repo, promotion.issue_number, {
      labels: undefined, // We need to fetch current labels first
    });

    // Build reverted labels: swap current priority back to original
    const otherLabels = issue.labels
      .map((l) => l.name)
      .filter((l) => !l.startsWith("priority: "));
    const revertedLabels =
      promotion.from_priority === "unset"
        ? otherLabels
        : [...otherLabels, `priority: ${promotion.from_priority}`];

    await updateIssue(octokit, owner, repo, promotion.issue_number, {
      labels: revertedLabels,
    });

    deletePromotion(promotionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

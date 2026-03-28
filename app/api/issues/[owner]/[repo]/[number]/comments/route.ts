import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { listIssueComments } from "@/lib/github/issues";
import { GitHubApiError } from "@/lib/github/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);
    const comments = await listIssueComments(octokit, owner, repo, parseInt(number, 10));
    return NextResponse.json(comments);
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

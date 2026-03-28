import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { getIssue, updateIssue } from "@/lib/github/issues";
import { GitHubApiError } from "@/lib/github/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);
    const issue = await getIssue(octokit, owner, repo, parseInt(number, 10));
    return NextResponse.json(issue);
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; number: string }> }
) {
  try {
    const { owner, repo, number } = await params;
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);
    const updates = await request.json();
    const issue = await updateIssue(octokit, owner, repo, parseInt(number, 10), updates);
    return NextResponse.json(issue);
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

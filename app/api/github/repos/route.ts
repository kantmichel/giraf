import { NextResponse } from "next/server";
import { getRequiredSession } from "@/lib/auth";
import { getOctokit } from "@/lib/github/client";
import { listUserRepos } from "@/lib/github/repos";
import { GitHubApiError } from "@/lib/github/errors";

export async function GET() {
  try {
    const session = await getRequiredSession();
    const octokit = getOctokit(session.accessToken);
    const repos = await listUserRepos(octokit);
    return NextResponse.json(repos);
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

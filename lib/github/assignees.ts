import type { Octokit } from "@octokit/rest";
import type { NormalizedUser } from "@/types/github";
import { handleGitHubError } from "./errors";

export async function listAssignees(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<NormalizedUser[]> {
  try {
    const assignees = await octokit.paginate(
      octokit.rest.issues.listAssignees,
      { owner, repo, per_page: 100 }
    );

    return assignees.map((a) => ({
      id: a.id,
      login: a.login,
      avatarUrl: a.avatar_url,
    }));
  } catch (error) {
    handleGitHubError(error);
  }
}

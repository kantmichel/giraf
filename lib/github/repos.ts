import type { Octokit } from "@octokit/rest";
import type { GitHubRepo } from "@/types/github";
import { handleGitHubError } from "./errors";

export async function listUserRepos(octokit: Octokit): Promise<GitHubRepo[]> {
  try {
    const repos = await octokit.paginate(
      octokit.rest.repos.listForAuthenticatedUser,
      {
        per_page: 100,
        sort: "updated",
        direction: "desc",
      }
    );

    return repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
      description: repo.description,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      updatedAt: repo.updated_at || new Date().toISOString(),
    }));
  } catch (error) {
    handleGitHubError(error);
  }
}

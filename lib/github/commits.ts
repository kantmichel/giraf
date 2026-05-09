import type { Octokit } from "@octokit/rest";
import { handleGitHubError } from "./errors";
import type { RepoCommitInput } from "@/lib/db/repo-commits-cache";

export interface RepoMetadata {
  createdAt: string;
  defaultBranch: string;
}

export async function getRepoMetadata(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<RepoMetadata> {
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return {
      createdAt: data.created_at,
      defaultBranch: data.default_branch,
    };
  } catch (error) {
    handleGitHubError(error);
  }
}

/**
 * Stream commits on the default branch page-by-page so callers can persist
 * incrementally without holding the full history in memory. Uses the commit
 * AUTHOR date for `committedAt` to keep timestamps consistent across squashes
 * and rebases.
 */
export async function* streamRepoCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  options?: { since?: string; until?: string }
): AsyncGenerator<RepoCommitInput[], void, unknown> {
  try {
    const iterator = octokit.paginate.iterator(octokit.rest.repos.listCommits, {
      owner,
      repo,
      per_page: 100,
      since: options?.since,
      until: options?.until,
    });
    for await (const { data } of iterator) {
      const page: RepoCommitInput[] = data.map((c) => ({
        sha: c.sha,
        committedAt:
          c.commit.author?.date ?? c.commit.committer?.date ?? "",
        authorLogin: c.author?.login ?? c.commit.author?.name ?? null,
        prNumber: null,
        isMerge: (c.parents?.length ?? 0) > 1,
      }));
      yield page;
    }
  } catch (error) {
    handleGitHubError(error);
  }
}

export interface ClosedPullSummary {
  number: number;
  updatedAt: string;
  mergedAt: string | null;
}

/**
 * Stream closed PRs sorted by updated_at desc, page-by-page. Callers can stop
 * iterating early once they hit a PR older than their cursor.
 */
export async function* streamClosedPulls(
  octokit: Octokit,
  owner: string,
  repo: string
): AsyncGenerator<ClosedPullSummary[], void, unknown> {
  try {
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.list, {
      owner,
      repo,
      state: "closed",
      sort: "updated",
      direction: "desc",
      per_page: 100,
    });
    for await (const { data } of iterator) {
      yield data.map((p) => ({
        number: p.number,
        updatedAt: p.updated_at,
        mergedAt: p.merged_at,
      }));
    }
  } catch (error) {
    handleGitHubError(error);
  }
}

/**
 * Fetch all commits attached to a single PR. Small N expected (rarely > 100).
 */
export async function listPullCommits(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<RepoCommitInput[]> {
  try {
    const data = await octokit.paginate(octokit.rest.pulls.listCommits, {
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });
    return data.map((c) => ({
      sha: c.sha,
      committedAt: c.commit.author?.date ?? c.commit.committer?.date ?? "",
      authorLogin: c.author?.login ?? c.commit.author?.name ?? null,
      prNumber,
      isMerge: (c.parents?.length ?? 0) > 1,
    }));
  } catch (error) {
    handleGitHubError(error);
  }
}

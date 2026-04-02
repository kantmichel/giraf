import type { Octokit } from "@octokit/rest";
import { handleGitHubError } from "./errors";

export interface NormalizedRelease {
  tagName: string;
  name: string;
  publishedAt: string;
  repo: string;
}

// Simple in-memory cache: repo -> { releases, fetchedAt }
const releaseCache = new Map<string, { releases: NormalizedRelease[]; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function listRepoReleases(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<NormalizedRelease[]> {
  const key = `${owner}/${repo}`;
  const cached = releaseCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.releases;
  }

  try {
    const { data } = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 100,
    });

    const releases = data
      .filter((r) => !r.draft)
      .map((r) => ({
        tagName: r.tag_name,
        name: r.name || r.tag_name,
        publishedAt: r.published_at || r.created_at,
        repo: key,
      }))
      .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());

    releaseCache.set(key, { releases, fetchedAt: Date.now() });
    return releases;
  } catch (error) {
    handleGitHubError(error);
  }
}

/**
 * Enrich issues with version based on release dates.
 * A closed issue belongs to the first release published after it was closed.
 */
export function enrichIssuesWithVersions(
  issues: { closedAt: string | null; version: string | null; repo: { fullName: string } }[],
  allReleases: NormalizedRelease[]
): void {
  const byRepo = new Map<string, NormalizedRelease[]>();
  for (const r of allReleases) {
    const list = byRepo.get(r.repo) ?? [];
    list.push(r);
    byRepo.set(r.repo, list);
  }

  for (const issue of issues) {
    if (!issue.closedAt) continue;
    const repoReleases = byRepo.get(issue.repo.fullName);
    if (!repoReleases?.length) continue;

    const closedTime = new Date(issue.closedAt).getTime();
    const release = repoReleases.find(
      (r) => new Date(r.publishedAt).getTime() >= closedTime
    );
    if (release) {
      issue.version = release.tagName;
    }
  }
}

import type { Octokit } from "@octokit/rest";
import { handleGitHubError } from "./errors";

export interface GHPullListItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  draft: boolean | undefined;
  user: { login: string; avatar_url: string; type: string } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  labels: { name: string }[];
  base: { ref: string };
  head: { ref: string };
  requested_reviewers:
    | { login: string; avatar_url: string; type: string }[]
    | undefined
    | null;
}

export interface GHPullDetails extends GHPullListItem {
  mergeable: boolean | null;
  mergeable_state: string;
  rebaseable: boolean | null;
  merged: boolean;
  review_comments: number;
  comments: number;
}

export interface GHPullReview {
  id: number;
  user: { login: string } | null;
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";
  submitted_at: string | null;
}

export async function listOpenPulls(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GHPullListItem[]> {
  try {
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
      sort: "updated",
      direction: "desc",
    });
    return data as unknown as GHPullListItem[];
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function getPullDetails(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GHPullDetails> {
  try {
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return data as unknown as GHPullDetails;
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function listPullReviews(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GHPullReview[]> {
  try {
    const { data } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 50,
    });
    return data as unknown as GHPullReview[];
  } catch (error) {
    handleGitHubError(error);
  }
}

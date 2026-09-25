import type { Octokit } from "@octokit/rest";

export interface MentionSearchResult {
  id: number;
  title: string;
  repoFullName: string;
  number: number;
  type: "issue" | "pull";
  state: "open" | "closed";
  htmlUrl: string;
  updatedAt: string;
  author: string;
}

/**
 * Every issue or PR mentioning the user, newest activity first.
 *
 * Deliberately not the notifications API: that keeps only a rolling window
 * (three threads where this returns over a hundred), so it cannot answer "where
 * was I tagged back in July". Search has no such horizon. The trade is that a
 * search hit points at the thread, never at the specific comment.
 */
export async function searchMentions(
  octokit: Octokit,
  username: string,
  org: string,
  limit = 300
): Promise<MentionSearchResult[]> {
  // Paginated: a single page caps at 100, which silently truncates anyone with
  // a longer history. GitHub's search refuses to go past 1000 results overall,
  // so `limit` keeps this from walking the whole way for no benefit.
  const items = await octokit.paginate(
    octokit.rest.search.issuesAndPullRequests,
    {
      q: org ? `mentions:${username} org:${org}` : `mentions:${username}`,
      sort: "updated",
      order: "desc",
      per_page: 100,
      advanced_search: "true",
    },
    (response, done) => {
      if (response.data.length >= limit) done();
      return response.data;
    }
  );

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: item.title,
    // The search payload carries repository_url rather than a repo object.
    repoFullName: item.repository_url.replace(
      /^https:\/\/api\.github\.com\/repos\//,
      ""
    ),
    number: item.number,
    type: item.pull_request ? "pull" : "issue",
    state: item.state === "closed" ? "closed" : "open",
    htmlUrl: item.html_url,
    updatedAt: item.updated_at,
    author: item.user?.login ?? "unknown",
  }));
}

import type { Octokit } from "@octokit/rest";

export interface NormalizedMention {
  /** GitHub's notification thread id — stable, used for local read state. */
  id: string;
  title: string;
  repoFullName: string;
  type: "issue" | "pull";
  number: number;
  /** Where to go: the comment anchor when the mention was in a comment,
   *  otherwise the issue or PR itself. */
  htmlUrl: string;
  /** True when htmlUrl points at a specific comment rather than the thread. */
  isComment: boolean;
  updatedAt: string;
}

interface GHNotification {
  id: string;
  reason: string;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: string;
  };
  repository: { full_name: string };
}

/**
 * Turn an API URL into the web one.
 *
 * Note the singular: the REST path is `/pulls/74` but the page is `/pull/74`.
 * Getting this wrong yields a 404 that only shows up for pull requests, which
 * are the minority of mentions and so easy to miss.
 */
function toHtmlUrl(apiUrl: string): { url: string; type: "issue" | "pull"; number: number } | null {
  const match = apiUrl.match(
    /repos\/([^/]+)\/([^/]+)\/(issues|pulls)\/(\d+)$/
  );
  if (!match) return null;
  const [, owner, repo, kind, number] = match;
  const path = kind === "pulls" ? "pull" : "issues";
  return {
    url: `https://github.com/${owner}/${repo}/${path}/${number}`,
    type: kind === "pulls" ? "pull" : "issue",
    number: parseInt(number, 10),
  };
}

/** `.../issues/comments/123` → the `#issuecomment-123` anchor on the thread. */
function commentAnchor(threadUrl: string, commentApiUrl: string): string | null {
  const match = commentApiUrl.match(/\/comments\/(\d+)$/);
  if (!match) return null;
  return `${threadUrl}#issuecomment-${match[1]}`;
}

/**
 * Every issue or PR where someone @-mentioned you, newest first.
 *
 * Read from GitHub on each call rather than cached locally: mentions are
 * GitHub's data, and a stale copy is worse than none. `all: true` is
 * deliberate — Gira tracks its own read state, so a mention already read on
 * github.com should still appear here until it is dismissed in Gira.
 */
export async function listMentions(
  octokit: Octokit,
  limit = 50
): Promise<NormalizedMention[]> {
  const { data } = await octokit.request("GET /notifications", {
    all: true,
    per_page: limit,
  });

  const mentions: NormalizedMention[] = [];
  for (const raw of data as unknown as GHNotification[]) {
    if (raw.reason !== "mention" && raw.reason !== "team_mention") continue;
    if (!raw.subject.url) continue;

    const target = toHtmlUrl(raw.subject.url);
    if (!target) continue;

    // GitHub sets latest_comment_url to the thread itself when the mention was
    // in the body rather than a comment, so an anchor is not always available.
    const anchor = raw.subject.latest_comment_url
      ? commentAnchor(target.url, raw.subject.latest_comment_url)
      : null;

    mentions.push({
      id: raw.id,
      title: raw.subject.title,
      repoFullName: raw.repository.full_name,
      type: target.type,
      number: target.number,
      htmlUrl: anchor ?? target.url,
      isComment: anchor !== null,
      updatedAt: raw.updated_at,
    });
  }

  return mentions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

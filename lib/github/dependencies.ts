import type { Octokit } from "@octokit/rest";
import type { IssueRef } from "@/types/github";

/**
 * Blocked-by edges for one repo, keyed by the blocked issue's number.
 * A blocker may live in another repo, so every edge carries its full ref.
 */
export type BlockedByMap = Map<number, IssueRef[]>;

interface DependencyQueryResult {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: {
        number: number;
        blockedBy: {
          nodes: {
            number: number;
            title: string;
            state: "OPEN" | "CLOSED";
            url: string;
            repository: { name: string; owner: { login: string } };
          }[];
        };
      }[];
    };
  };
}

// GraphQL bills by requested node count, and connections multiply: nesting a
// 20-label list inside a 20-blocker list inside 100 issues asks for 40,000
// nodes a page and burns the hourly budget in a handful of board loads. Only
// the blocker's own fields are fetched here; its Gira status is filled in from
// the issues already loaded, which costs nothing.
const DEPENDENCY_QUERY = `
  query($owner: String!, $repo: String!, $states: [IssueState!], $cursor: String) {
    repository(owner: $owner, name: $repo) {
      issues(first: 100, states: $states, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number
          blockedBy(first: 10) {
            nodes {
              number
              title
              state
              url
              repository { name owner { login } }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch every blocked-by edge in a repo. Issues with no blocker are omitted,
 * so the map is usually far smaller than the issue count.
 *
 * GitHub exposes dependencies per issue over REST, which would be one call per
 * row; GraphQL returns a whole page of edges at once.
 */
export async function listBlockedBy(
  octokit: Octokit,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open"
): Promise<BlockedByMap> {
  const states =
    state === "all" ? ["OPEN", "CLOSED"] : [state.toUpperCase()];
  const blockedBy: BlockedByMap = new Map();
  let cursor: string | null = null;

  try {
    do {
      const result: DependencyQueryResult = await octokit.graphql(
        DEPENDENCY_QUERY,
        { owner, repo, states, cursor }
      );
      const page = result.repository.issues;
      for (const node of page.nodes) {
        if (node.blockedBy.nodes.length === 0) continue;
        blockedBy.set(
          node.number,
          node.blockedBy.nodes.map((b) => ({
            owner: b.repository.owner.login,
            repo: b.repository.name,
            number: b.number,
            title: b.title,
            state: b.state === "CLOSED" ? ("closed" as const) : ("open" as const),
            status: null,
            htmlUrl: b.url,
          }))
        );
      }
      cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);

    return blockedBy;
  } catch (error) {
    // Dependencies are an enrichment, not the board's reason for existing.
    // GitHub's issue-dependency fields are newer than the rest of the API and
    // are not available to every token, so a failure here degrades to "no
    // dependencies known" instead of emptying the issue list.
    const detail =
      (error as { errors?: { type?: string; message?: string }[] })?.errors
        ?.map((e) => `${e.type ?? "ERROR"}: ${e.message}`)
        .join(" | ") ?? (error instanceof Error ? error.message : String(error));
    console.error(
      `[dependencies] ${owner}/${repo}: falling back to no dependencies — ${detail}`
    );
    return new Map();
  }
}

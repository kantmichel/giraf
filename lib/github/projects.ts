import type { Octokit } from "@octokit/rest";
import type { FeatureRef, NormalizedIssue } from "@/types/github";

/**
 * An open org Project, read as a feature: its tickets, in the Project's own
 * order. Projects are GitHub's cross-repo grouping, so a feature can hold
 * tickets from every repo it touches.
 */
export interface FeatureProject {
  owner: string;
  number: number;
  title: string;
  url: string;
  /** Issues in the Project, in its order. Draft items and PRs are left out. */
  items: { owner: string; repo: string; number: number }[];
}

interface ItemNode {
  content: {
    __typename: string;
    number?: number;
    repository?: { name: string; owner: { login: string } };
  } | null;
}

interface ItemsPage {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: ItemNode[];
}

interface ProjectsQueryResult {
  organization: {
    projectsV2: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: {
        id: string;
        number: number;
        title: string;
        url: string;
        closed: boolean;
        items: ItemsPage;
      }[];
    };
  } | null;
}

interface ItemsQueryResult {
  node: { items: ItemsPage } | null;
}

// Shallow on purpose (see "Watch the cost of GraphQL queries" in CLAUDE.md):
// per item only the issue's number and repo, nothing nested under it. Titles,
// labels and status are already on the issues the board loaded. Measured on
// flipstream-io with 7 Projects: cost 1.
const PROJECTS_QUERY = `
  query($owner: String!, $cursor: String) {
    organization(login: $owner) {
      projectsV2(first: 20, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          number
          title
          url
          closed
          items(first: 100, orderBy: { field: POSITION, direction: ASC }) {
            pageInfo { hasNextPage endCursor }
            nodes {
              content {
                __typename
                ... on Issue { number repository { name owner { login } } }
              }
            }
          }
        }
      }
    }
  }
`;

// Only for a Project with more than 100 items, which none has today.
const MORE_ITEMS_QUERY = `
  query($id: ID!, $cursor: String) {
    node(id: $id) {
      ... on ProjectV2 {
        items(first: 100, after: $cursor, orderBy: { field: POSITION, direction: ASC }) {
          pageInfo { hasNextPage endCursor }
          nodes {
            content {
              __typename
              ... on Issue { number repository { name owner { login } } }
            }
          }
        }
      }
    }
  }
`;

// Same in-memory pattern as lib/github/releases.ts. Projects change when
// someone plans, not on every board load, so a short window saves a GraphQL
// call per refresh and still shows a newly added ticket within two minutes.
const projectCache = new Map<string, { projects: FeatureProject[]; fetchedAt: number }>();
const CACHE_TTL = 2 * 60 * 1000;

function issueItems(nodes: ItemNode[]): FeatureProject["items"] {
  const items: FeatureProject["items"] = [];
  for (const node of nodes) {
    const c = node.content;
    if (c?.__typename !== "Issue" || c.number === undefined || !c.repository) continue;
    items.push({ owner: c.repository.owner.login, repo: c.repository.name, number: c.number });
  }
  return items;
}

/**
 * The open Projects of an org, each with its issues in order. Throws when
 * GitHub refuses, for callers that need to say why (the plan page asks the
 * person to sign in again). Only successes are cached.
 */
export async function fetchFeatureProjects(
  octokit: Octokit,
  owner: string
): Promise<FeatureProject[]> {
  const cached = projectCache.get(owner);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.projects;

  const projects: FeatureProject[] = [];
  let cursor: string | null = null;
  do {
    let result: ProjectsQueryResult;
    try {
      result = await octokit.graphql(PROJECTS_QUERY, { owner, cursor });
    } catch (error) {
      // A tracked repo owned by a person, not an org, has no org Projects:
      // that is "no features", not a failure worth asking anyone to fix.
      const errors = (error as { errors?: { type?: string }[] })?.errors;
      if (errors?.length && errors.every((e) => e.type === "NOT_FOUND")) break;
      throw error;
    }
    const page = result.organization?.projectsV2;
    if (!page) break;
    for (const p of page.nodes) {
      if (p.closed) continue;
      const items = issueItems(p.items.nodes);
      let itemCursor = p.items.pageInfo.hasNextPage ? p.items.pageInfo.endCursor : null;
      while (itemCursor) {
        const more: ItemsQueryResult = await octokit.graphql(MORE_ITEMS_QUERY, { id: p.id, cursor: itemCursor });
        if (!more.node) break;
        items.push(...issueItems(more.node.items.nodes));
        itemCursor = more.node.items.pageInfo.hasNextPage ? more.node.items.pageInfo.endCursor : null;
      }
      projects.push({ owner, number: p.number, title: p.title, url: p.url, items });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  projectCache.set(owner, { projects, fetchedAt: Date.now() });
  return projects;
}

export function describeGraphqlError(error: unknown): string {
  return (
    (error as { errors?: { type?: string; message?: string }[] })?.errors
      ?.map((e) => `${e.type ?? "ERROR"}: ${e.message}`)
      .join(" | ") ?? (error instanceof Error ? error.message : String(error))
  );
}

/**
 * fetchFeatureProjects for decoration: never throws. Features decorate the
 * board, so a token without the `project` scope, a user-owned repo (no
 * organization to ask) or a rate-limited call all degrade to "no features
 * known" rather than emptying the page.
 */
export async function listFeatureProjects(
  octokit: Octokit,
  owner: string
): Promise<FeatureProject[]> {
  try {
    return await fetchFeatureProjects(octokit, owner);
  } catch (error) {
    console.error(`[projects] ${owner}: falling back to no features — ${describeGraphqlError(error)}`);
    return [];
  }
}

/** Put each issue's features on it, in place. */
export function attachFeatures(issues: NormalizedIssue[], projects: FeatureProject[]): void {
  const byIssue = new Map<string, FeatureRef[]>();
  for (const p of projects) {
    p.items.forEach((item, position) => {
      const key = `${item.owner}/${item.repo}#${item.number}`;
      const refs = byIssue.get(key) ?? [];
      refs.push({ owner: p.owner, number: p.number, title: p.title, url: p.url, position });
      byIssue.set(key, refs);
    });
  }
  for (const issue of issues) {
    issue.features = byIssue.get(`${issue.repo.fullName}#${issue.number}`) ?? [];
  }
}

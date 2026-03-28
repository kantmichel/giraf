import type { Octokit } from "@octokit/rest";
import type { NormalizedIssue, NormalizedUser, NormalizedLabel, IssueComment } from "@/types/github";
import { handleGitHubError } from "./errors";

const STATUS_PREFIX = "status: ";
const PRIORITY_PREFIX = "priority: ";

type StatusValue = "to do" | "doing" | "in review" | "done";
type PriorityValue = "critical" | "high" | "medium" | "low";

function extractStatus(labels: NormalizedLabel[]): StatusValue | null {
  const statusLabel = labels.find((l) =>
    l.name.toLowerCase().startsWith(STATUS_PREFIX)
  );
  if (!statusLabel) return null;
  return statusLabel.name.toLowerCase().replace(STATUS_PREFIX, "") as StatusValue;
}

function extractPriority(labels: NormalizedLabel[]): PriorityValue | null {
  const priorityLabel = labels.find((l) =>
    l.name.toLowerCase().startsWith(PRIORITY_PREFIX)
  );
  if (!priorityLabel) return null;
  return priorityLabel.name.toLowerCase().replace(PRIORITY_PREFIX, "") as PriorityValue;
}

function normalizeLabels(
  labels: { id?: number; name?: string; color?: string; description?: string | null }[]
): NormalizedLabel[] {
  return labels
    .filter((l): l is { id: number; name: string; color: string; description: string | null } =>
      typeof l.id === "number" && typeof l.name === "string" && typeof l.color === "string"
    )
    .map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      description: l.description ?? null,
    }));
}

function normalizeAssignees(
  assignees: { id: number; login: string; avatar_url: string }[] | null | undefined
): NormalizedUser[] {
  if (!assignees) return [];
  return assignees.map((a) => ({
    id: a.id,
    login: a.login,
    avatarUrl: a.avatar_url,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeIssue(issue: any, owner: string, repo: string): NormalizedIssue {
  const labels = normalizeLabels(issue.labels || []);
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body || null,
    state: issue.state as "open" | "closed",
    htmlUrl: issue.html_url,
    repo: { owner, name: repo, fullName: `${owner}/${repo}` },
    status: extractStatus(labels),
    priority: extractPriority(labels),
    assignees: normalizeAssignees(issue.assignees),
    labels,
    milestone: issue.milestone
      ? { title: issue.milestone.title, number: issue.milestone.number }
      : null,
    linkedPrs: [],
    version: null,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  };
}

export async function listRepoIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  options?: {
    state?: "open" | "closed" | "all";
    labels?: string;
    per_page?: number;
  }
): Promise<NormalizedIssue[]> {
  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: options?.state ?? "open",
      labels: options?.labels,
      per_page: options?.per_page ?? 100,
      sort: "updated",
      direction: "desc",
    });

    return data
      .filter((issue) => !issue.pull_request)
      .map((issue) => normalizeIssue(issue, owner, repo));
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function updateIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  updates: {
    title?: string;
    body?: string;
    state?: "open" | "closed";
    labels?: string[];
    assignees?: string[];
  }
): Promise<NormalizedIssue> {
  try {
    const { data } = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...updates,
    });

    return normalizeIssue(data, owner, repo);
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function getIssue(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<NormalizedIssue> {
  try {
    const { data } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return normalizeIssue(data, owner, repo);
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function listIssueComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<IssueComment[]> {
  try {
    const comments = await octokit.paginate(
      octokit.rest.issues.listComments,
      { owner, repo, issue_number: issueNumber, per_page: 100 }
    );

    return comments.map((c) => ({
      id: c.id,
      body: c.body || "",
      user: {
        id: c.user?.id || 0,
        login: c.user?.login || "unknown",
        avatarUrl: c.user?.avatar_url || "",
      },
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      htmlUrl: c.html_url,
    }));
  } catch (error) {
    handleGitHubError(error);
  }
}

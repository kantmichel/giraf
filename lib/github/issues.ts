import type { Octokit } from "@octokit/rest";
import type { NormalizedIssue, NormalizedUser, NormalizedLabel, NormalizedLinkedPr, IssueComment } from "@/types/github";
import { handleGitHubError } from "./errors";
import { extractClaudeState } from "@/lib/claude-workflow";

const STATUS_PREFIX = "status: ";
const PRIORITY_PREFIX = "priority: ";
const EFFORT_PREFIX = "effort: ";
const IMPACT_PREFIX = "impact: ";

type StatusValue = "to do" | "doing" | "in review" | "done";
type PriorityValue = "critical" | "high" | "medium" | "low";
type EffortValue = "low" | "medium" | "high";

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

function extractEffort(labels: NormalizedLabel[]): EffortValue | null {
  const effortLabel = labels.find((l) =>
    l.name.toLowerCase().startsWith(EFFORT_PREFIX)
  );
  if (!effortLabel) return null;
  return effortLabel.name.toLowerCase().replace(EFFORT_PREFIX, "") as EffortValue;
}

function extractImpacts(labels: NormalizedLabel[]): string[] {
  return labels
    .filter((l) => l.name.toLowerCase().startsWith(IMPACT_PREFIX))
    .map((l) => l.name.toLowerCase().replace(IMPACT_PREFIX, ""));
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
    effort: extractEffort(labels),
    impacts: extractImpacts(labels),
    claudeState: extractClaudeState(labels),
    assignees: normalizeAssignees(issue.assignees),
    labels,
    milestone: issue.milestone
      ? { title: issue.milestone.title, number: issue.milestone.number }
      : null,
    linkedPrs: [],
    version: null,
    createdBy: {
      id: issue.user?.id || 0,
      login: issue.user?.login || "unknown",
      avatarUrl: issue.user?.avatar_url || "",
    },
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    closedAt: issue.closed_at || null,
  };
}

/**
 * Extract issue numbers referenced by closing keywords in text.
 * Matches: close/closes/closed/fix/fixes/fixed/resolve/resolves/resolved #N
 */
function extractClosingRefs(text: string): number[] {
  const regex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const numbers: number[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    numbers.push(parseInt(match[1], 10));
  }
  return numbers;
}

export async function listRepoIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  options?: {
    state?: "open" | "closed" | "all";
    labels?: string;
    per_page?: number;
    since?: string;
  }
): Promise<NormalizedIssue[]> {
  try {
    // Auto-paginate so we don't silently cap the response at 100 items.
    // Necessary for callers that pass a wide `since` window (e.g. the
    // agents dashboard fetches closed issues since Oct 1 2025).
    const data = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: options?.state ?? "open",
      labels: options?.labels,
      per_page: options?.per_page ?? 100,
      sort: "updated",
      direction: "desc",
      since: options?.since,
    });

    // Separate issues from PRs (GitHub's issues endpoint returns both)
    const issues = data.filter((item) => !item.pull_request);
    const prs = data.filter((item) => !!item.pull_request);

    // Build map: issue number -> linked PRs (from closing keywords in PR title/body)
    const prsByIssue = new Map<number, NormalizedLinkedPr[]>();
    for (const pr of prs) {
      const text = `${pr.title ?? ""} ${pr.body ?? ""}`;
      const refs = extractClosingRefs(text);
      for (const issueNum of refs) {
        if (!prsByIssue.has(issueNum)) prsByIssue.set(issueNum, []);
        const state: NormalizedLinkedPr["state"] = pr.draft
          ? "draft"
          : pr.pull_request?.merged_at
            ? "merged"
            : (pr.state as "open" | "closed");
        prsByIssue.get(issueNum)!.push({
          number: pr.number,
          title: pr.title ?? "",
          state,
          htmlUrl: pr.html_url,
        });
      }
    }

    return issues.map((issue) => {
      const normalized = normalizeIssue(issue, owner, repo);
      normalized.linkedPrs = prsByIssue.get(issue.number) ?? [];
      return normalized;
    });
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

/**
 * Fire-and-forget: for any closed issue that doesn't have "status: done",
 * swap its status label to "status: done" on GitHub.
 * Also patches the in-memory issues array so the response reflects the fix.
 */
export function syncClosedStatusLabels(
  octokit: Octokit,
  issues: NormalizedIssue[]
): void {
  for (const issue of issues) {
    if (issue.state !== "closed" || issue.status === "done") continue;

    const newLabels = [
      ...issue.labels.filter((l) => !l.name.toLowerCase().startsWith(STATUS_PREFIX)),
      { id: 0, name: "status: done", color: "0e8a16", description: null },
    ];

    // Patch in-memory so the response is already correct
    issue.status = "done";
    issue.labels = newLabels;

    // Fire-and-forget GitHub update
    updateIssue(octokit, issue.repo.owner, issue.repo.name, issue.number, {
      labels: newLabels.map((l) => l.name),
    }).catch(() => {
      // Silently ignore — label sync is best-effort
    });
  }
}

const CLAUDE_STATUS_MAP: Record<string, string> = {
  "claude-review-start": "status: doing",
  "claude-reviewing": "status: doing",
  "claude-review-done": "status: in review",
  "claude-start": "status: doing",
  "claude-working": "status: doing",
  "claude-done": "status: in review",
};

export function syncClaudeStatusLabels(
  octokit: Octokit,
  issues: NormalizedIssue[]
): void {
  for (const issue of issues) {
    if (issue.state === "closed") continue;

    let targetStatus: string | null = null;
    for (const label of issue.labels) {
      if (CLAUDE_STATUS_MAP[label.name]) {
        targetStatus = CLAUDE_STATUS_MAP[label.name];
        break;
      }
    }
    if (!targetStatus) continue;

    const currentStatusLabel = issue.status ? `status: ${issue.status}` : null;
    if (currentStatusLabel === targetStatus) continue;

    const newLabels = [
      ...issue.labels.filter((l) => !l.name.toLowerCase().startsWith(STATUS_PREFIX)),
      { id: 0, name: targetStatus, color: targetStatus === "status: doing" ? "fbca04" : "1d76db", description: null },
    ];

    // Patch in-memory so the response is already correct
    issue.status = targetStatus.replace("status: ", "") as StatusValue;
    issue.labels = newLabels;

    // Fire-and-forget GitHub update
    updateIssue(octokit, issue.repo.owner, issue.repo.name, issue.number, {
      labels: newLabels.map((l) => l.name),
    }).catch(() => {});
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

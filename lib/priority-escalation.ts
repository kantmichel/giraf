import type { Octokit } from "@octokit/rest";
import type { NormalizedIssue } from "@/types/github";
import { getTrackedRepos } from "@/lib/db/tracked-repos";
import { logPromotion } from "@/lib/db/priority-promotions";
import { listRepoIssues } from "@/lib/github/issues";
import { updateIssue } from "@/lib/github/issues";

export interface PromotionResult {
  promotedIssue: NormalizedIssue;
  fromPriority: string;
  toPriority: string;
  promotionId: number;
}

// Maps: completed priority → which priority to promote FROM
const PROMOTION_MAP: Record<string, string | null> = {
  high: "medium",
  medium: "low",
  low: null, // promote unset to low
  critical: null, // no auto-promotion for critical
};

export async function checkAndPromote(
  octokit: Octokit,
  workspaceId: string,
  completedIssue: NormalizedIssue
): Promise<PromotionResult | null> {
  const completedPriority = completedIssue.priority;
  if (!completedPriority) return null;
  if (completedPriority === "critical") return null;

  const fromPriority = PROMOTION_MAP[completedPriority];
  const toPriority = completedPriority;

  // Get the assignees of the completed issue
  const assigneeLogins = completedIssue.assignees.map((a) => a.login);
  if (assigneeLogins.length === 0) return null;

  // Fetch all "to do" issues across tracked repos
  const trackedRepos = getTrackedRepos(workspaceId);
  const allTodoIssues: NormalizedIssue[] = [];

  const results = await Promise.allSettled(
    trackedRepos.map((repo) =>
      listRepoIssues(octokit, repo.owner, repo.repo, { state: "open" })
    )
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allTodoIssues.push(...result.value);
    }
  }

  // Filter: same assignee, "to do" status, matching priority tier
  const candidates = allTodoIssues.filter((issue) => {
    if (issue.status !== "to do") return false;
    if (!issue.assignees.some((a) => assigneeLogins.includes(a.login))) return false;

    if (fromPriority === null) {
      // Promote unset priority to low
      return issue.priority === null;
    }
    return issue.priority === fromPriority;
  });

  if (candidates.length === 0) return null;

  // Pick the oldest one (by createdAt)
  candidates.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const candidate = candidates[0];

  // Build new labels: remove old priority, add new one
  const otherLabels = candidate.labels
    .map((l) => l.name)
    .filter((l) => !l.startsWith("priority: "));
  const newLabels = [...otherLabels, `priority: ${toPriority}`];

  // Update on GitHub
  const promoted = await updateIssue(
    octokit,
    candidate.repo.owner,
    candidate.repo.name,
    candidate.number,
    { labels: newLabels }
  );

  // Log the promotion
  const promotionId = logPromotion(
    workspaceId,
    candidate.repo.fullName,
    candidate.number,
    fromPriority ?? "unset",
    toPriority,
    completedIssue.repo.fullName,
    completedIssue.number
  );

  return {
    promotedIssue: promoted,
    fromPriority: fromPriority ?? "unset",
    toPriority,
    promotionId,
  };
}

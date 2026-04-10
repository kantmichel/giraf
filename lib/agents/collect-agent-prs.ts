import type { Octokit } from "@octokit/rest";
import { listRepoIssues } from "@/lib/github/issues";
import {
  getPullDetails,
  listOpenPulls,
  listPullReviews,
  type GHPullDetails,
  type GHPullListItem,
} from "@/lib/github/pulls";
import type { AgentPr, PrAttentionReason } from "@/types/agents";
import {
  computeDaysSince,
  computeRiskScore,
  derivePrReasons,
  isAgentAuthor,
  normaliseMergeableState,
} from "./compute-pr-risk";

export interface CollectAgentPrsInput {
  octokit: Octokit;
  owner: string;
  repo: string;
}

/**
 * For a single repo: fetch issues + open PRs, filter to "agent-relevant"
 * PRs (linked to a Claude-tracked issue OR authored by an agent bot),
 * enrich each with pulls.get + reviews, map to AgentPr.
 */
export async function collectAgentPrsForRepo({
  octokit,
  owner,
  repo,
}: CollectAgentPrsInput): Promise<AgentPr[]> {
  // Parallel: issues (for claude-tracked linkedPrs) + all open PRs (for filter + enrichment)
  const [issues, openPulls] = await Promise.all([
    listRepoIssues(octokit, owner, repo, { state: "open" }).catch(
      () => [] as Awaited<ReturnType<typeof listRepoIssues>>
    ),
    listOpenPulls(octokit, owner, repo).catch(
      () => [] as GHPullListItem[]
    ),
  ]);

  // Build the set of PR numbers that are linked to a claude-tracked issue
  const claudeLinkedPrNumbers = new Set<number>();
  for (const issue of issues) {
    if (!issue.claudeState) continue;
    for (const linkedPr of issue.linkedPrs) {
      claudeLinkedPrNumbers.add(linkedPr.number);
    }
  }

  // Filter open PRs
  const filtered: { pr: GHPullListItem; source: AgentPr["matchSource"] }[] = [];
  for (const pr of openPulls) {
    const linked = claudeLinkedPrNumbers.has(pr.number);
    const authored = isAgentAuthor(pr.user?.login, pr.user?.type);
    if (linked && authored) {
      filtered.push({ pr, source: "both" });
    } else if (linked) {
      filtered.push({ pr, source: "linked-issue" });
    } else if (authored) {
      filtered.push({ pr, source: "author" });
    }
  }

  // Enrich each filtered PR in parallel: get details + reviews
  const enriched = await Promise.all(
    filtered.map(async ({ pr, source }) => {
      try {
        const [details, reviews] = await Promise.all([
          getPullDetails(octokit, owner, repo, pr.number),
          listPullReviews(octokit, owner, repo, pr.number).catch(() => []),
        ]);

        // Compute approval state from reviews (latest review per user wins)
        const latestByUser = new Map<string, string>();
        for (const review of reviews) {
          if (!review.user?.login || !review.submitted_at) continue;
          latestByUser.set(review.user.login, review.state);
        }
        const approvedBy: string[] = [];
        let changesRequestedCount = 0;
        for (const [login, state] of latestByUser.entries()) {
          if (state === "APPROVED") approvedBy.push(login);
          else if (state === "CHANGES_REQUESTED") changesRequestedCount++;
        }

        return mapToAgentPr({
          details,
          listItem: pr,
          source,
          owner,
          repo,
          approvedBy,
          changesRequestedCount,
        });
      } catch {
        return null;
      }
    })
  );

  return enriched.filter((p): p is AgentPr => p !== null);
}

interface MapInput {
  details: GHPullDetails;
  listItem: GHPullListItem;
  source: AgentPr["matchSource"];
  owner: string;
  repo: string;
  approvedBy: string[];
  changesRequestedCount: number;
}

function mapToAgentPr({
  details,
  listItem,
  source,
  owner,
  repo,
  approvedBy,
  changesRequestedCount,
}: MapInput): AgentPr {
  const ageDays = computeDaysSince(details.created_at);
  const staleDays = computeDaysSince(details.updated_at);
  const mergeableState = normaliseMergeableState(details.mergeable_state);
  const requestedReviewerCount = Array.isArray(listItem.requested_reviewers)
    ? listItem.requested_reviewers.length
    : 0;
  const draft = details.draft ?? false;

  const reasons: PrAttentionReason[] = derivePrReasons({
    draft,
    mergeableState,
    ageDays,
    staleDays,
    approvedCount: approvedBy.length,
    changesRequestedCount,
    requestedReviewerCount,
  });

  const partial: Omit<AgentPr, "riskScore" | "reasons"> = {
    number: details.number,
    title: details.title,
    htmlUrl: details.html_url,
    draft,
    merged: details.merged,
    repo: { owner, name: repo },
    author: {
      login: details.user?.login ?? "unknown",
      avatarUrl: details.user?.avatar_url ?? "",
      isBot: details.user?.type === "Bot",
    },
    createdAt: details.created_at,
    updatedAt: details.updated_at,
    ageDays: Math.round(ageDays * 10) / 10,
    staleDays: Math.round(staleDays * 10) / 10,
    mergeableState,
    requestedReviewerCount,
    approvedBy,
    labels: (details.labels ?? []).map((l) => l.name),
    baseRef: details.base.ref,
    headRef: details.head.ref,
    behindBy: null,
    matchSource: source,
  };

  const riskScore = computeRiskScore(partial);

  return {
    ...partial,
    reasons,
    riskScore,
  };
}

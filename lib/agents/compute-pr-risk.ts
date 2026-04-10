import type {
  AgentPr,
  PrAttentionReason,
  PrMergeableState,
} from "@/types/agents";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeDaysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / DAY_MS;
}

export function normaliseMergeableState(raw: string): PrMergeableState {
  switch (raw) {
    case "clean":
    case "dirty":
    case "blocked":
    case "unstable":
    case "behind":
    case "unknown":
      return raw;
    default:
      return "unknown";
  }
}

export function derivePrReasons(input: {
  draft: boolean;
  mergeableState: PrMergeableState;
  ageDays: number;
  staleDays: number;
  approvedCount: number;
  changesRequestedCount: number;
  requestedReviewerCount: number;
}): PrAttentionReason[] {
  const reasons: PrAttentionReason[] = [];
  if (input.mergeableState === "dirty") reasons.push("conflict");
  if (
    !input.draft &&
    input.approvedCount > 0 &&
    input.changesRequestedCount === 0 &&
    input.mergeableState !== "dirty"
  ) {
    reasons.push("ready-to-merge");
  }
  if (
    !input.draft &&
    input.approvedCount === 0 &&
    (input.requestedReviewerCount > 0 || input.mergeableState === "blocked")
  ) {
    reasons.push("awaiting-review");
  }
  if (input.draft) reasons.push("draft");
  if (input.staleDays >= 3) reasons.push("stale");
  if (reasons.length === 0) reasons.push("fresh");
  return reasons;
}

/**
 * Higher score = more attention needed. Sort descending.
 *
 * Score model:
 *  base = ageDays
 *  × 2.0 if has conflicts (dirty)
 *  × 1.5 if approved but unmerged (easy win, click to merge)
 *  × 1.2 if awaiting review
 *  × 0.5 if still draft (author not done yet)
 *  + bonus for staleness (time since last push/update)
 */
export function computeRiskScore(pr: Omit<AgentPr, "riskScore" | "reasons">): number {
  let score = pr.ageDays;
  if (pr.mergeableState === "dirty") score *= 2.0;
  if (pr.draft) score *= 0.5;
  if (pr.approvedBy.length > 0 && pr.mergeableState !== "dirty") score *= 1.5;
  if (pr.requestedReviewerCount > 0 && pr.approvedBy.length === 0) score *= 1.2;
  score += pr.staleDays * 0.5;
  return Math.round(score * 10) / 10;
}

const AGENT_AUTHOR_PATTERNS = ["claude", "gira", "copilot"];

export function isAgentAuthor(
  login: string | undefined | null,
  type: string | undefined | null
): boolean {
  if (!login) return false;
  const l = login.toLowerCase();
  for (const pattern of AGENT_AUTHOR_PATTERNS) {
    if (l.includes(pattern)) return true;
  }
  if (type === "Bot" && (l.includes("ai") || l.includes("agent"))) return true;
  return false;
}

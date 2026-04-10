import type { NormalizedIssue } from "@/types/github";
import type {
  AgentKind,
  AgentRun,
  AgentRunStatus,
  AgentStage,
  StageStatus,
} from "@/types/agents";
import { CLAUDE_REVIEW_STAGES, CLAUDE_WORK_STAGES } from "./stage-model";

const PAUSED_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Turn a list of NormalizedIssue into AgentRun objects for the agents dashboard.
 * Only issues with a claudeState become runs.
 */
export function deriveClaudeRuns(
  openIssues: NormalizedIssue[],
  closedIssues: NormalizedIssue[]
): AgentRun[] {
  const runs: AgentRun[] = [];
  for (const issue of openIssues) {
    const run = deriveOneRun(issue);
    if (run) runs.push(run);
  }
  for (const issue of closedIssues) {
    const run = deriveOneRun(issue);
    if (run) runs.push(run);
  }
  return runs;
}

function deriveOneRun(issue: NormalizedIssue): AgentRun | null {
  if (!issue.claudeState) return null;

  const isReview =
    issue.claudeState === "review-queued" ||
    issue.claudeState === "reviewing" ||
    issue.claudeState === "review-done" ||
    issue.claudeState === "review-failed";

  const kind: AgentKind = isReview ? "claude-review" : "claude-work";
  const stageDefs = isReview ? CLAUDE_REVIEW_STAGES : CLAUDE_WORK_STAGES;

  const { currentStageIndex, status } = isReview
    ? resolveReviewStage(issue)
    : resolveWorkStage(issue);

  const stages: AgentStage[] = stageDefs.map((def, idx) => {
    let stageStatus: StageStatus;
    if (status === "failed" && idx === currentStageIndex) {
      stageStatus = "failed";
    } else if (idx < currentStageIndex) {
      stageStatus = "complete";
    } else if (idx === currentStageIndex) {
      stageStatus = status === "paused" ? "paused" : "active";
      if (status === "completed") stageStatus = "complete";
    } else {
      stageStatus = "pending";
    }
    return { def, status: stageStatus };
  });

  const assignee = issue.assignees[0];

  return {
    id: `${kind}:${issue.repo.fullName}#${issue.number}`,
    kind,
    title: issue.title,
    subtitle: issue.repo.fullName,
    status,
    currentStageIndex,
    stages,
    startedAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    endedAt: issue.closedAt ?? undefined,
    durationMs: issue.closedAt
      ? new Date(issue.closedAt).getTime() - new Date(issue.createdAt).getTime()
      : Date.now() - new Date(issue.createdAt).getTime(),
    issue: {
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      htmlUrl: issue.htmlUrl,
    },
    linkedPrs: issue.linkedPrs,
    actor: assignee
      ? { login: assignee.login, avatarUrl: assignee.avatarUrl }
      : undefined,
  };
}

function resolveWorkStage(issue: NormalizedIssue): {
  currentStageIndex: number;
  status: AgentRunStatus;
} {
  if (issue.claudeState === "failed") {
    const idx = mostProgressedWorkStage(issue);
    return { currentStageIndex: idx, status: "failed" };
  }

  const prs = issue.linkedPrs ?? [];
  const mergedPr = prs.find((p) => p.state === "merged");
  const openPr = prs.find((p) => p.state === "open");
  const draftPr = prs.find((p) => p.state === "draft");

  if (mergedPr || (issue.state === "closed" && issue.claudeState === "done")) {
    return { currentStageIndex: 4, status: "completed" };
  }
  if (openPr) {
    const ageMs = Date.now() - new Date(issue.updatedAt).getTime();
    const paused = ageMs > PAUSED_THRESHOLD_MS;
    return { currentStageIndex: 3, status: paused ? "paused" : "running" };
  }
  if (draftPr) {
    return { currentStageIndex: 2, status: "running" };
  }
  if (issue.claudeState === "working") {
    return { currentStageIndex: 1, status: "running" };
  }
  if (issue.claudeState === "work-queued") {
    return { currentStageIndex: 0, status: "queued" };
  }
  if (issue.claudeState === "done") {
    // done but no PR yet (edge case) — treat as PR Opened placeholder
    return { currentStageIndex: 2, status: "running" };
  }
  return { currentStageIndex: 0, status: "queued" };
}

function mostProgressedWorkStage(issue: NormalizedIssue): number {
  const prs = issue.linkedPrs ?? [];
  if (prs.some((p) => p.state === "merged")) return 4;
  if (prs.some((p) => p.state === "open")) return 3;
  if (prs.some((p) => p.state === "draft")) return 2;
  if (issue.claudeState === "working") return 1;
  return 0;
}

function resolveReviewStage(issue: NormalizedIssue): {
  currentStageIndex: number;
  status: AgentRunStatus;
} {
  switch (issue.claudeState) {
    case "review-queued":
      return { currentStageIndex: 0, status: "queued" };
    case "reviewing":
      return { currentStageIndex: 1, status: "running" };
    case "review-done":
      return { currentStageIndex: 2, status: "completed" };
    case "review-failed":
      return { currentStageIndex: 1, status: "failed" };
    default:
      return { currentStageIndex: 0, status: "queued" };
  }
}

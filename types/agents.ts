import type { NormalizedLinkedPr } from "./github";

export type AgentKind = "claude-work" | "claude-review" | "gh-action";

export type AgentRunStatus = "running" | "queued" | "paused" | "completed" | "failed";

export type StageStatus = "pending" | "active" | "complete" | "paused" | "failed" | "skipped";

export interface AgentStageDef {
  code: string;
  label: string;
  jobNames?: string[];
}

export interface AgentStage {
  def: AgentStageDef;
  status: StageStatus;
  startedAt?: string;
  endedAt?: string;
}

export interface AgentRun {
  id: string;
  kind: AgentKind;
  title: string;
  subtitle?: string;
  status: AgentRunStatus;
  currentStageIndex: number;
  stages: AgentStage[];
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  durationMs?: number;
  issue?: { owner: string; repo: string; number: number; htmlUrl: string };
  linkedPrs?: NormalizedLinkedPr[];
  actor?: { login: string; avatarUrl: string };
  workflow?: { id: number; name: string; path: string; htmlUrl: string };
  headBranch?: string;
  headSha?: string;
  conclusion?: "success" | "failure" | "cancelled" | "skipped" | null;
  runNumber?: number;
  jobs?: WorkflowJobSummary[];
}

export interface WorkflowJobSummary {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  startedAt: string | null;
  completedAt: string | null;
  htmlUrl: string;
}

export interface ImportedWorkflow {
  id: number;
  workspaceId: string;
  repo: { owner: string; name: string };
  workflow: { id: number; name: string; path: string };
  displayName: string | null;
  description: string | null;
  stages: AgentStageDef[];
  scheduleCrons: string[];
  enabled: boolean;
  importedAt: string;
  importedBy: string;
  lastSyncedAt: string | null;
}

export interface ScheduledAgent {
  workflow: ImportedWorkflow;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunConclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  cadenceLabel: string;
}

export interface DiscoveredWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  htmlUrl: string;
  alreadyImported: boolean;
}

export interface DiscoveredWorkflowGroup {
  repo: { owner: string; name: string };
  workflows: DiscoveredWorkflow[];
}

export type PrMergeableState =
  | "clean"
  | "dirty"
  | "blocked"
  | "unstable"
  | "behind"
  | "unknown";

export type PrAttentionReason =
  | "conflict"
  | "ready-to-merge"
  | "awaiting-review"
  | "draft"
  | "stale"
  | "fresh";

export interface AgentPr {
  number: number;
  title: string;
  htmlUrl: string;
  draft: boolean;
  merged: boolean;
  repo: { owner: string; name: string };
  author: { login: string; avatarUrl: string; isBot: boolean };
  createdAt: string;
  updatedAt: string;
  ageDays: number;
  staleDays: number;
  mergeableState: PrMergeableState;
  requestedReviewerCount: number;
  approvedBy: string[];
  labels: string[];
  baseRef: string;
  headRef: string;
  behindBy: number | null;
  reasons: PrAttentionReason[];
  riskScore: number;
  matchSource: "linked-issue" | "author" | "both";
}

export interface AgentPrSummary {
  totalOpen: number;
  avgAgeDays: number;
  conflicts: number;
  readyToMerge: number;
  awaitingReview: number;
  stale: number;
}

export interface WorkflowRunRow {
  id: number;
  workspace_id: string;
  agent_workflow_id: number | null;
  repo_owner: string;
  repo_name: string;
  workflow_id: number;
  workflow_name: string;
  workflow_path: string;
  head_sha: string | null;
  head_branch: string | null;
  event: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  html_url: string;
  run_number: number | null;
  run_started_at: string | null;
  created_at: string;
  updated_at: string;
  actor_login: string | null;
  actor_avatar_url: string | null;
  jobs_json: string | null;
  fetched_at: string;
}

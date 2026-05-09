export interface NormalizedIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  htmlUrl: string;
  repo: { owner: string; name: string; fullName: string };
  status: "to do" | "doing" | "in review" | "done" | null;
  priority: "critical" | "high" | "medium" | "low" | null;
  effort: "low" | "medium" | "high" | null;
  /** Impact tags (e.g. "customer") parsed from `impact: <type>` labels. Empty array if none. */
  impacts: string[];
  claudeState: "review-queued" | "reviewing" | "review-done" | "review-failed" | "work-queued" | "working" | "done" | "failed" | null;
  assignees: NormalizedUser[];
  labels: NormalizedLabel[];
  milestone: { title: string; number: number } | null;
  linkedPrs: NormalizedLinkedPr[];
  version: string | null;
  createdBy: NormalizedUser;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface NormalizedUser {
  id: number;
  login: string;
  avatarUrl: string;
}

export interface NormalizedLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface NormalizedLinkedPr {
  number: number;
  title: string;
  state: "open" | "closed" | "merged" | "draft";
  htmlUrl: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: { login: string; avatarUrl: string };
  description: string | null;
  isPrivate: boolean;
  htmlUrl: string;
  language: string | null;
  stargazersCount: number;
  updatedAt: string;
}

export interface TrackedRepoRow {
  id: number;
  workspace_id: string;
  owner: string;
  repo: string;
  added_by: string;
  added_at: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

export interface IssueComment {
  id: number;
  body: string;
  user: NormalizedUser;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export type CommitSource = "default_branch" | "pr_original";

export interface RepoCommitRow {
  workspace_id: string;
  repo_owner: string;
  repo_name: string;
  commit_sha: string;
  source: CommitSource;
  /** ISO timestamp; ALWAYS author.date for consistency across squashed and rebased flows. */
  committed_at: string;
  author_login: string | null;
  pr_number: number | null;
  is_merge: number;
  cached_at: string;
}

export interface RepoCommitsSyncStateRow {
  workspace_id: string;
  repo_owner: string;
  repo_name: string;
  repo_created_at: string | null;
  series_a_oldest_iso: string | null;
  series_a_last_synced_at: string | null;
  series_a_in_progress: number;
  series_a_progress_seen: number;
  series_a_last_error: string | null;
  series_b_last_pr_number: number | null;
  series_b_last_pr_updated: string | null;
  series_b_last_synced_at: string | null;
  series_b_in_progress: number;
  series_b_progress_seen: number;
  series_b_progress_total: number | null;
  series_b_backfill_done: number;
  series_b_last_error: string | null;
}

export type CommitVelocityBucketSize = "day" | "week" | "month";

export interface CommitVelocityBucket {
  /** ISO date (YYYY-MM-DD) representing the start of the bucket in UTC. */
  date: string;
  seriesA: number;
  seriesB: number;
}

export interface SeriesSyncStatus {
  lastSyncedAt: string | null;
  inProgress: boolean;
  progressSeen: number;
  progressTotal?: number | null;
  backfillDone?: boolean;
  lastError: string | null;
}

export interface CommitVelocityResponse {
  repo: { owner: string; name: string; createdAt: string | null };
  range: { from: string; to: string; bucket: CommitVelocityBucketSize };
  buckets: CommitVelocityBucket[];
  syncStatus: {
    seriesA: SeriesSyncStatus;
    seriesB: SeriesSyncStatus;
  };
}

export interface FilterConfig {
  repos: string[];
  assignees: string[];
  labels: string[];
  priority: string[];
  effort: string[];
  status: string[];
  ai: string[];
  version: string[];
  hasPr: boolean;
  state: "open" | "closed" | "all";
  milestone: string[];
  search: string;
}

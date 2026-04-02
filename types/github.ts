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

export interface FilterConfig {
  repos: string[];
  assignees: string[];
  labels: string[];
  priority: string[];
  effort: string[];
  status: string[];
  ai: string[];
  hasPr: boolean;
  state: "open" | "closed" | "all";
  milestone: string[];
  search: string;
}

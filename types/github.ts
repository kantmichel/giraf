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
  assignees: NormalizedUser[];
  labels: NormalizedLabel[];
  milestone: { title: string; number: number } | null;
  linkedPrs: NormalizedLinkedPr[];
  version: string | null;
  createdAt: string;
  updatedAt: string;
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
  status: string[];
  state: "open" | "closed" | "all";
  milestone: string[];
  search: string;
}

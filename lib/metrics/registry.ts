export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: "current" | "historical";
  defaultSelected: boolean;
}

export const METRICS_REGISTRY: MetricDefinition[] = [
  // Current metrics (from already-fetched issues)
  {
    id: "status-distribution",
    name: "Status Distribution",
    description: "Breakdown of issues by status",
    category: "current",
    defaultSelected: true,
  },
  {
    id: "priority-breakdown",
    name: "Priority Breakdown",
    description: "Issues grouped by priority level",
    category: "current",
    defaultSelected: false,
  },
  {
    id: "assignee-workload",
    name: "Assignee Workload",
    description: "Number of active issues per person",
    category: "current",
    defaultSelected: false,
  },
  {
    id: "untriaged-count",
    name: "Untriaged",
    description: "Issues missing status or priority",
    category: "current",
    defaultSelected: true,
  },
  {
    id: "effort-split",
    name: "Effort Split",
    description: "Distribution of effort across issues",
    category: "current",
    defaultSelected: false,
  },
  {
    id: "issues-per-repo",
    name: "Issues per Repo",
    description: "Issue count by repository",
    category: "current",
    defaultSelected: false,
  },
  {
    id: "avg-issue-age",
    name: "Avg Issue Age",
    description: "Average age of open issues in days",
    category: "current",
    defaultSelected: true,
  },
  {
    id: "oldest-open-issue",
    name: "Oldest Open",
    description: "The oldest unresolved issue",
    category: "current",
    defaultSelected: false,
  },
  {
    id: "on-fire",
    name: "On Fire",
    description: "Critical/high priority issues older than 7 days",
    category: "current",
    defaultSelected: true,
  },
  {
    id: "filter-summary",
    name: "Filter Summary",
    description: "Dynamic summary of current filter state",
    category: "current",
    defaultSelected: false,
  },
  // Historical metrics (need closed issues API call)
  {
    id: "closed-over-time",
    name: "Closed Over Time",
    description: "Daily closed issue count for the last 30 days",
    category: "historical",
    defaultSelected: false,
  },
  {
    id: "created-vs-closed",
    name: "Created vs Closed",
    description: "Created and closed issues trend over 30 days",
    category: "historical",
    defaultSelected: false,
  },
  {
    id: "avg-resolution-time",
    name: "Avg Resolution Time",
    description: "Average days from creation to close",
    category: "historical",
    defaultSelected: true,
  },
  {
    id: "closed-this-vs-last-week",
    name: "Closed This Week",
    description: "Issues closed this week compared to last",
    category: "historical",
    defaultSelected: false,
  },
  {
    id: "closed-by-person",
    name: "Closed by Person",
    description: "Issues closed per person over the last 30 days",
    category: "historical",
    defaultSelected: false,
  },
  {
    id: "resolution-time-dist",
    name: "Resolution Time Dist.",
    description: "Distribution of time-to-close for resolved issues",
    category: "historical",
    defaultSelected: false,
  },
  {
    id: "daily-streak",
    name: "Daily Streak",
    description: "Consecutive days with at least one issue closed",
    category: "historical",
    defaultSelected: false,
  },
];

export const DEFAULT_SELECTED_METRICS = METRICS_REGISTRY
  .filter((m) => m.defaultSelected)
  .map((m) => m.id);

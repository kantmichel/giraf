"use client";

import type { NormalizedIssue } from "@/types/github";
import { MetricStatusDistribution } from "./metric-status-distribution";
import { MetricPriorityBreakdown } from "./metric-priority-breakdown";
import { MetricAssigneeWorkload } from "./metric-assignee-workload";
import { MetricUntriagedCount } from "./metric-untriaged-count";
import { MetricEffortSplit } from "./metric-effort-split";
import { MetricIssuesPerRepo } from "./metric-issues-per-repo";
import { MetricAvgIssueAge } from "./metric-avg-issue-age";
import { MetricOldestOpenIssue } from "./metric-oldest-open-issue";
import { MetricOnFire } from "./metric-on-fire";
import { MetricFilterSummary } from "./metric-filter-summary";
import { MetricClosedOverTime } from "./metric-closed-over-time";
import { MetricCreatedVsClosed } from "./metric-created-vs-closed";
import { MetricAvgResolutionTime } from "./metric-avg-resolution-time";
import { MetricClosedThisVsLastWeek } from "./metric-closed-this-vs-last-week";
import { MetricClosedByPerson } from "./metric-closed-by-person";
import { MetricResolutionTimeDist } from "./metric-resolution-time-dist";
import { MetricDailyStreak } from "./metric-daily-streak";

export interface MetricRendererProps {
  id: string;
  issues: NormalizedIssue[];
  allIssues: NormalizedIssue[];
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricRenderer({
  id,
  issues,
  allIssues,
  closedIssues,
  size,
  isSelected,
  onToggleSelected,
  isLoading,
}: MetricRendererProps) {
  const common = { size, isSelected, onToggleSelected, isLoading } as const;

  switch (id) {
    case "status-distribution":
      return <MetricStatusDistribution issues={issues} {...common} />;
    case "priority-breakdown":
      return <MetricPriorityBreakdown issues={issues} {...common} />;
    case "assignee-workload":
      return <MetricAssigneeWorkload issues={issues} {...common} />;
    case "untriaged-count":
      return <MetricUntriagedCount issues={issues} {...common} />;
    case "effort-split":
      return <MetricEffortSplit issues={issues} {...common} />;
    case "issues-per-repo":
      return <MetricIssuesPerRepo issues={issues} {...common} />;
    case "avg-issue-age":
      return <MetricAvgIssueAge issues={issues} {...common} />;
    case "oldest-open-issue":
      return <MetricOldestOpenIssue issues={issues} {...common} />;
    case "on-fire":
      return <MetricOnFire issues={issues} {...common} />;
    case "filter-summary":
      return <MetricFilterSummary issues={issues} allIssues={allIssues} {...common} />;
    case "closed-over-time":
      return <MetricClosedOverTime closedIssues={closedIssues} {...common} />;
    case "created-vs-closed":
      return <MetricCreatedVsClosed allIssues={allIssues} closedIssues={closedIssues} {...common} />;
    case "avg-resolution-time":
      return <MetricAvgResolutionTime closedIssues={closedIssues} {...common} />;
    case "closed-this-vs-last-week":
      return <MetricClosedThisVsLastWeek closedIssues={closedIssues} {...common} />;
    case "closed-by-person":
      return <MetricClosedByPerson closedIssues={closedIssues} {...common} />;
    case "resolution-time-dist":
      return <MetricResolutionTimeDist closedIssues={closedIssues} {...common} />;
    case "daily-streak":
      return <MetricDailyStreak closedIssues={closedIssues} {...common} />;
    default:
      return null;
  }
}

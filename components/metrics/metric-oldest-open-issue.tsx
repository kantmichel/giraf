"use client";

import { useMemo } from "react";
import { Hourglass } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeOldestOpenIssue } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricOldestOpenIssue({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const result = useMemo(() => computeOldestOpenIssue(issues), [issues]);

  return (
    <MetricCard title="Oldest Open" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {!result ? (
        <span className="text-sm text-muted-foreground">No open issues</span>
      ) : size === "mini" ? (
        <a href={result.issue.htmlUrl} target="_blank" rel="noopener noreferrer" className="group block">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold tabular-nums">{result.ageDays}</span>
            <span className="text-[11px] text-muted-foreground">days</span>
          </div>
          <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground transition-colors">
            #{result.issue.number} {result.issue.title}
          </p>
        </a>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hourglass className="size-5 text-muted-foreground" />
            <span className="text-3xl font-bold tabular-nums">{result.ageDays}</span>
            <span className="text-sm text-muted-foreground">days old</span>
          </div>
          <a
            href={result.issue.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            #{result.issue.number} {result.issue.title}
            <span className="text-xs ml-1 text-muted-foreground">({result.issue.repo.name})</span>
          </a>
        </div>
      )}
    </MetricCard>
  );
}

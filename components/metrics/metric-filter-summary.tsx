"use client";

import { useMemo } from "react";
import { MetricCard } from "./metric-card";
import { computeFilterSummary } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  issues: NormalizedIssue[];
  allIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricFilterSummary({ issues, allIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const summary = useMemo(() => computeFilterSummary(issues, allIssues), [issues, allIssues]);

  return (
    <MetricCard title="Filter Summary" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      <p className={size === "mini" ? "text-xs text-muted-foreground leading-tight" : "text-sm text-muted-foreground"}>
        {summary}
      </p>
    </MetricCard>
  );
}

"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeAvgIssueAge } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricAvgIssueAge({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const avgDays = useMemo(() => computeAvgIssueAge(issues), [issues]);
  const openCount = useMemo(() => issues.filter((i) => i.state === "open").length, [issues]);

  return (
    <MetricCard title="Avg Issue Age" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold tabular-nums">{avgDays}</span>
          <span className="text-[11px] text-muted-foreground">days</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <span className="text-3xl font-bold tabular-nums">{avgDays}</span>
            <span className="text-sm text-muted-foreground">days avg</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Across {openCount} open issue{openCount !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </MetricCard>
  );
}

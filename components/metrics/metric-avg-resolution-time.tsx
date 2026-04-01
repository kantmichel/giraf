"use client";

import { useMemo } from "react";
import { Timer } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeAvgResolutionTime } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricAvgResolutionTime({ closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const avgDays = useMemo(() => computeAvgResolutionTime(closedIssues), [closedIssues]);

  return (
    <MetricCard title="Avg Resolution Time" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold tabular-nums">{avgDays}</span>
          <span className="text-[11px] text-muted-foreground">days</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Timer className="size-5 text-muted-foreground" />
            <span className="text-3xl font-bold tabular-nums">{avgDays}</span>
            <span className="text-sm text-muted-foreground">days avg</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Average time from creation to close (last 30 days)
          </p>
        </div>
      )}
    </MetricCard>
  );
}

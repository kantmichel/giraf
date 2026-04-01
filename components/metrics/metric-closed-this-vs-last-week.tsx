"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeClosedThisVsLastWeek } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricClosedThisVsLastWeek({ closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeClosedThisVsLastWeek(closedIssues), [closedIssues]);

  const TrendIcon = data.changePercent === null || data.changePercent === 0
    ? Minus
    : data.changePercent > 0
      ? TrendingUp
      : TrendingDown;

  const trendColor = data.changePercent === null || data.changePercent === 0
    ? "text-muted-foreground"
    : data.changePercent > 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  return (
    <MetricCard title="Closed This Week" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold tabular-nums">{data.thisWeek}</span>
          <TrendIcon className={`size-3.5 ${trendColor}`} />
          {data.changePercent !== null && (
            <span className={`text-[11px] ${trendColor}`}>{data.changePercent > 0 ? "+" : ""}{data.changePercent}%</span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tabular-nums">{data.thisWeek}</span>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="size-5" />
              {data.changePercent !== null && (
                <span className="text-sm font-medium">{data.changePercent > 0 ? "+" : ""}{data.changePercent}%</span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            vs {data.lastWeek} last week
          </p>
        </div>
      )}
    </MetricCard>
  );
}

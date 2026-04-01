"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeDailyStreak } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricDailyStreak({ closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const streak = useMemo(() => computeDailyStreak(closedIssues), [closedIssues]);

  return (
    <MetricCard title="Daily Streak" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold tabular-nums">{streak}</span>
          {streak > 0 && <Flame className="size-3.5 text-orange-500" />}
          <span className="text-[11px] text-muted-foreground">day{streak !== 1 ? "s" : ""}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold tabular-nums">{streak}</span>
            <Flame className={`size-6 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </div>
          <p className="text-sm text-muted-foreground">
            {streak > 0
              ? `${streak} consecutive day${streak !== 1 ? "s" : ""} with at least one issue closed`
              : "No issues closed today or yesterday"}
          </p>
        </div>
      )}
    </MetricCard>
  );
}

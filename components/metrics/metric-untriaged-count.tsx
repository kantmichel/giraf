"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeUntriagedCount } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricUntriagedCount({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeUntriagedCount(issues), [issues]);

  return (
    <MetricCard title="Untriaged" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-semibold tabular-nums ${data.total > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
            {data.total}
          </span>
          {data.total > 0 && <AlertTriangle className="size-3.5 text-amber-500" />}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold tabular-nums ${data.total > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {data.total}
            </span>
            {data.total > 0 && <AlertTriangle className="size-5 text-amber-500" />}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{data.noStatus}</span> missing status
            </div>
            <div>
              <span className="font-medium text-foreground">{data.noPriority}</span> missing priority
            </div>
          </div>
        </div>
      )}
    </MetricCard>
  );
}

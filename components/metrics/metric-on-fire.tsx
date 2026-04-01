"use client";

import { useMemo } from "react";
import { Flame } from "lucide-react";
import { MetricCard } from "./metric-card";
import { computeOnFireCount } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricOnFire({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeOnFireCount(issues), [issues]);

  return (
    <MetricCard title="On Fire" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-semibold tabular-nums ${data.count > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
            {data.count}
          </span>
          {data.count > 0 && <Flame className="size-4 text-red-500" />}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold tabular-nums ${data.count > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
              {data.count}
            </span>
            <Flame className={`size-6 ${data.count > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </div>
          <p className="text-sm text-muted-foreground">
            Critical/high priority issues older than 7 days
          </p>
          {data.issues.length > 0 && (
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {data.issues.slice(0, 5).map((issue) => (
                <a
                  key={issue.id}
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  #{issue.number} {issue.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </MetricCard>
  );
}

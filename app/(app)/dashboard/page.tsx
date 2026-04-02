"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIssues } from "@/hooks/use-issues";
import { useClosedIssues } from "@/hooks/use-closed-issues";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { METRICS_REGISTRY, DEFAULT_SELECTED_METRICS } from "@/lib/metrics/registry";
import { MetricRenderer } from "@/components/metrics";
import type { FilterConfig } from "@/types/github";

const defaultFilters: FilterConfig = {
  repos: [],
  assignees: [],
  labels: [],
  priority: [],
  effort: [],
  status: [],
  ai: [],
  version: [],
  hasPr: false,
  state: "open",
  milestone: [],
  search: "",
};

function DashboardContent() {
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const { issues, allIssues, isLoading: issuesLoading } = useIssues(defaultFilters);
  const { data: closedData, isLoading: closedLoading } = useClosedIssues();

  const selectedMetrics = prefs?.dashboard_metrics ?? DEFAULT_SELECTED_METRICS;

  function toggleMetric(id: string) {
    const next = selectedMetrics.includes(id)
      ? selectedMetrics.filter((m) => m !== id)
      : [...selectedMetrics, id];
    updatePrefs.mutate({ dashboard_metrics: next });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Toggle metrics to show on the issues page.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {METRICS_REGISTRY.map((metric) => (
          <MetricRenderer
            key={metric.id}
            id={metric.id}
            issues={issues}
            allIssues={allIssues}
            closedIssues={closedData?.issues ?? []}
            size="full"
            isSelected={selectedMetrics.includes(metric.id)}
            onToggleSelected={() => toggleMetric(metric.id)}
            isLoading={issuesLoading || (metric.category === "historical" && closedLoading)}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

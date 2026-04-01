"use client";

import Link from "next/link";
import { BarChart3, ChevronDown, Settings2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import { useClosedIssues } from "@/hooks/use-closed-issues";
import { METRICS_REGISTRY, DEFAULT_SELECTED_METRICS } from "@/lib/metrics/registry";
import { MetricRenderer } from "@/components/metrics";
import type { NormalizedIssue } from "@/types/github";

interface MetricsMiniRowProps {
  issues: NormalizedIssue[];
  allIssues: NormalizedIssue[];
}

export function MetricsMiniRow({ issues, allIssues }: MetricsMiniRowProps) {
  const { data: prefs } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  const selectedIds = prefs?.dashboard_metrics ?? DEFAULT_SELECTED_METRICS;
  const isCollapsed = prefs?.metrics_collapsed ?? false;

  const needsHistorical = !isCollapsed && selectedIds.some(
    (id) => METRICS_REGISTRY.find((m) => m.id === id)?.category === "historical"
  );
  const { data: closedData, isLoading: closedLoading } = useClosedIssues(needsHistorical);

  const selectedMetrics = METRICS_REGISTRY.filter((m) => selectedIds.includes(m.id));

  if (selectedMetrics.length === 0) return null;

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={(open) => updatePrefs.mutate({ metrics_collapsed: !open })}
    >
      <div className="flex items-center gap-1">
        <CollapsibleTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <BarChart3 className="size-3.5" />
          <span>Metrics</span>
          <ChevronDown className="size-3 transition-transform duration-200 data-[state=closed]:-rotate-90" />
        </CollapsibleTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
              <Link href="/dashboard">
                <Settings2 className="size-3 text-muted-foreground" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Configure metrics</TooltipContent>
        </Tooltip>
      </div>
      <CollapsibleContent>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {selectedMetrics.map((metric) => (
            <MetricRenderer
              key={metric.id}
              id={metric.id}
              issues={issues}
              allIssues={allIssues}
              closedIssues={closedData?.issues ?? []}
              size="mini"
              isLoading={metric.category === "historical" && closedLoading}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

"use client";

import { useMemo } from "react";
import { Bar, BarChart, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeIssuesPerRepo } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const chartConfig: ChartConfig = {
  count: { label: "Issues", color: "var(--chart-2)" },
};

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricIssuesPerRepo({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeIssuesPerRepo(issues), [issues]);

  return (
    <MetricCard title="Issues per Repo" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1">
          {data.slice(0, 3).map((d) => (
            <div key={d.repo} className="flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground">{d.repo}</span>
              <span className="font-medium tabular-nums ml-2">{d.count}</span>
            </div>
          ))}
          {data.length === 0 && <span className="text-xs text-muted-foreground">No data</span>}
        </div>
      ) : (
        <>
          {data.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
              <BarChart accessibilityLayer data={data}>
                <XAxis dataKey="repo" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </>
      )}
    </MetricCard>
  );
}

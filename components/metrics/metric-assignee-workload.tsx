"use client";

import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeAssigneeWorkload } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const chartConfig: ChartConfig = {
  count: { label: "Issues", color: "var(--chart-1)" },
};

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricAssigneeWorkload({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeAssigneeWorkload(issues), [issues]);

  return (
    <MetricCard title="Assignee Workload" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1">
          {data.slice(0, 3).map((d) => (
            <div key={d.login} className="flex items-center gap-1.5 text-xs">
              <span className="truncate text-muted-foreground w-16">{d.login}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-chart-1"
                  style={{ width: `${data[0]?.count ? (d.count / data[0].count) * 100 : 0}%` }}
                />
              </div>
              <span className="font-medium tabular-nums text-[11px] w-4 text-right">{d.count}</span>
            </div>
          ))}
          {data.length === 0 && <span className="text-xs text-muted-foreground">No assignees</span>}
        </div>
      ) : (
        <>
          {data.length > 0 ? (
            <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
              <BarChart accessibilityLayer data={data.slice(0, 10)} layout="vertical">
                <YAxis dataKey="login" type="category" tickLine={false} axisLine={false} width={80} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No assigned issues</p>
          )}
        </>
      )}
    </MetricCard>
  );
}

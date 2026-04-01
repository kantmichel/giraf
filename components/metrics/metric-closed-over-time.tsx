"use client";

import { useMemo } from "react";
import { Area, AreaChart, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeClosedOverTime } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const chartConfig: ChartConfig = {
  count: { label: "Closed", color: "var(--chart-2)" },
};

interface Props {
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricClosedOverTime({ closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeClosedOverTime(closedIssues), [closedIssues]);
  const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

  return (
    <MetricCard title="Closed Over Time" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold tabular-nums">{total}</span>
            <span className="text-[11px] text-muted-foreground">30d</span>
          </div>
          <div className="h-6 w-full">
            <ChartContainer config={chartConfig} className="h-6 w-full [&_.recharts-cartesian-grid]:hidden" initialDimension={{ width: 160, height: 24 }}>
              <AreaChart data={data}>
                <Area type="monotone" dataKey="count" fill="var(--color-count)" fillOpacity={0.3} stroke="var(--color-count)" strokeWidth={1.5} />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{total} issues closed in the last 30 days</p>
          <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
            <AreaChart accessibilityLayer data={data}>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                interval="preserveStartEnd"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="count" fill="var(--color-count)" fillOpacity={0.3} stroke="var(--color-count)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </MetricCard>
  );
}

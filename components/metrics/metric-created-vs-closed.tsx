"use client";

import { useMemo } from "react";
import { Line, LineChart, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeCreatedVsClosed } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const chartConfig: ChartConfig = {
  created: { label: "Created", color: "var(--chart-1)" },
  closed: { label: "Closed", color: "var(--chart-2)" },
};

interface Props {
  allIssues: NormalizedIssue[];
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricCreatedVsClosed({ allIssues, closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeCreatedVsClosed(allIssues, closedIssues), [allIssues, closedIssues]);

  return (
    <MetricCard title="Created vs Closed" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="h-8 w-full">
          <ChartContainer config={chartConfig} className="h-8 w-full [&_.recharts-cartesian-grid]:hidden" initialDimension={{ width: 160, height: 32 }}>
            <LineChart data={data}>
              <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="closed" stroke="var(--color-closed)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <LineChart accessibilityLayer data={data}>
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
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="closed" stroke="var(--color-closed)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      )}
    </MetricCard>
  );
}

"use client";

import { useMemo } from "react";
import { Bar, BarChart, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeResolutionTimeDistribution } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const chartConfig: ChartConfig = {
  count: { label: "Issues", color: "var(--chart-3)" },
};

interface Props {
  closedIssues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricResolutionTimeDist({ closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeResolutionTimeDistribution(closedIssues), [closedIssues]);
  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  return (
    <MetricCard title="Resolution Time Dist." size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="flex items-end gap-0.5 h-6">
          {data.map((d) => (
            <div
              key={d.bucket}
              className="flex-1 rounded-sm bg-chart-3"
              style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? "2px" : "0" }}
              title={`${d.bucket}: ${d.count}`}
            />
          ))}
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
          <BarChart accessibilityLayer data={data}>
            <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </MetricCard>
  );
}

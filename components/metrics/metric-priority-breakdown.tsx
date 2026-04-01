"use client";

import { useMemo } from "react";
import { Bar, BarChart, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computePriorityBreakdown } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "oklch(0.577 0.245 27.325)",
  high: "oklch(0.646 0.222 41.116)",
  medium: "oklch(0.795 0.184 86.047)",
  low: "oklch(0.627 0.194 149.214)",
  unset: "oklch(0.872 0 0)",
};

const chartConfig: ChartConfig = {
  critical: { label: "Critical", color: PRIORITY_COLORS.critical },
  high: { label: "High", color: PRIORITY_COLORS.high },
  medium: { label: "Medium", color: PRIORITY_COLORS.medium },
  low: { label: "Low", color: PRIORITY_COLORS.low },
  unset: { label: "Unset", color: PRIORITY_COLORS.unset },
};

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricPriorityBreakdown({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computePriorityBreakdown(issues), [issues]);
  const total = useMemo(() => Object.values(data).reduce((s, v) => s + v, 0), [data]);

  const chartData = useMemo(
    () => ["critical", "high", "medium", "low", "unset"].map((p) => ({ priority: p, count: data[p] ?? 0, fill: PRIORITY_COLORS[p] })),
    [data]
  );

  return (
    <MetricCard title="Priority Breakdown" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1.5">
          <div className="text-lg font-semibold tabular-nums">{total}</div>
          {total > 0 && (
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {["critical", "high", "medium", "low", "unset"].map((p) =>
                (data[p] ?? 0) > 0 ? (
                  <div key={p} className="transition-all" style={{ width: `${((data[p] ?? 0) / total) * 100}%`, backgroundColor: PRIORITY_COLORS[p] }} />
                ) : null
              )}
            </div>
          )}
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <XAxis dataKey="priority" tickLine={false} axisLine={false} tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
            <ChartTooltip content={<ChartTooltipContent nameKey="priority" hideLabel />} />
            <Bar dataKey="count" radius={4}>
              {chartData.map((entry) => (
                <Bar key={entry.priority} dataKey="count" fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </MetricCard>
  );
}

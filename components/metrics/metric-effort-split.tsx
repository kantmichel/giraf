"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeEffortSplit } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const EFFORT_COLORS: Record<string, string> = {
  low: "oklch(0.627 0.194 149.214)",
  medium: "oklch(0.795 0.184 86.047)",
  high: "oklch(0.646 0.222 41.116)",
  unset: "oklch(0.872 0 0)",
};

const chartConfig: ChartConfig = {
  low: { label: "Low", color: EFFORT_COLORS.low },
  medium: { label: "Medium", color: EFFORT_COLORS.medium },
  high: { label: "High", color: EFFORT_COLORS.high },
  unset: { label: "Unset", color: EFFORT_COLORS.unset },
};

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricEffortSplit({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeEffortSplit(issues), [issues]);
  const total = useMemo(() => Object.values(data).reduce((s, v) => s + v, 0), [data]);

  const chartData = useMemo(
    () =>
      ["low", "medium", "high", "unset"]
        .filter((e) => (data[e] ?? 0) > 0)
        .map((e) => ({ effort: e, count: data[e] ?? 0, fill: EFFORT_COLORS[e] })),
    [data]
  );

  return (
    <MetricCard title="Effort Split" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1.5">
          <div className="text-lg font-semibold tabular-nums">{total}</div>
          {total > 0 && (
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {["low", "medium", "high", "unset"].map((e) =>
                (data[e] ?? 0) > 0 ? (
                  <div key={e} className="transition-all" style={{ width: `${((data[e] ?? 0) / total) * 100}%`, backgroundColor: EFFORT_COLORS[e] }} />
                ) : null
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="effort" hideLabel />} />
              <Pie data={chartData} dataKey="count" nameKey="effort" innerRadius={50} strokeWidth={2}>
                {chartData.map((entry) => (
                  <Cell key={entry.effort} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(data).map(([effort, count]) => (
              <div key={effort} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: EFFORT_COLORS[effort] }} />
                <span className="text-muted-foreground capitalize">{effort}</span>
                <span className="ml-auto font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MetricCard>
  );
}

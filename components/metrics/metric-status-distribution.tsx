"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeStatusDistribution } from "@/lib/metrics/compute";
import type { NormalizedIssue } from "@/types/github";

const STATUS_COLORS: Record<string, string> = {
  "to do": "oklch(0.708 0 0)",
  doing: "oklch(0.795 0.184 86.047)",
  "in review": "oklch(0.623 0.214 259.815)",
  done: "oklch(0.627 0.194 149.214)",
  unset: "oklch(0.872 0 0)",
};

const chartConfig: ChartConfig = {
  "to do": { label: "To Do", color: STATUS_COLORS["to do"] },
  doing: { label: "Doing", color: STATUS_COLORS.doing },
  "in review": { label: "In Review", color: STATUS_COLORS["in review"] },
  done: { label: "Done", color: STATUS_COLORS.done },
  unset: { label: "Unset", color: STATUS_COLORS.unset },
};

interface Props {
  issues: NormalizedIssue[];
  size: "full" | "mini";
  isSelected?: boolean;
  onToggleSelected?: () => void;
  isLoading?: boolean;
}

export function MetricStatusDistribution({ issues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeStatusDistribution(issues), [issues]);
  const total = useMemo(() => Object.values(data).reduce((s, v) => s + v, 0), [data]);

  const chartData = useMemo(
    () =>
      Object.entries(data)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ status, count, fill: STATUS_COLORS[status] })),
    [data]
  );

  return (
    <MetricCard title="Status Distribution" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1.5">
          <div className="text-lg font-semibold tabular-nums">{total}</div>
          {total > 0 && (
            <div className="flex h-2 w-full overflow-hidden rounded-full">
              {Object.entries(data).map(([status, count]) =>
                count > 0 ? (
                  <div
                    key={status}
                    className="transition-all"
                    style={{
                      width: `${(count / total) * 100}%`,
                      backgroundColor: STATUS_COLORS[status],
                    }}
                  />
                ) : null
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
              <Pie data={chartData} dataKey="count" nameKey="status" innerRadius={50} strokeWidth={2}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(data).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
                <span className="text-muted-foreground capitalize">{status}</span>
                <span className="ml-auto font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MetricCard>
  );
}

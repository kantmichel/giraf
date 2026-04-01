"use client";

import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { MetricCard } from "./metric-card";
import { computeClosedByPerson } from "@/lib/metrics/compute";
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

export function MetricClosedByPerson({ closedIssues, size, isSelected, onToggleSelected, isLoading }: Props) {
  const data = useMemo(() => computeClosedByPerson(closedIssues), [closedIssues]);

  return (
    <MetricCard title="Closed by Person" size={size} isSelected={isSelected} onToggleSelected={onToggleSelected} isLoading={isLoading}>
      {size === "mini" ? (
        <div className="space-y-1">
          {data.slice(0, 3).map((d) => (
            <div key={d.login} className="flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground">{d.login}</span>
              <span className="font-medium tabular-nums ml-2">{d.count}</span>
            </div>
          ))}
          {data.length === 0 && <span className="text-xs text-muted-foreground">No data</span>}
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
            <p className="text-sm text-muted-foreground">No closed issues in the last 30 days</p>
          )}
        </>
      )}
    </MetricCard>
  );
}

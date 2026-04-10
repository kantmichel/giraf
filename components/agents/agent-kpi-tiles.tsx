"use client";

import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AgentKpis } from "@/hooks/use-agent-runs";
import type { DateRange } from "@/lib/agents/date-range";

interface AgentKpiTilesProps {
  kpis: AgentKpis;
  range: DateRange;
}

export function AgentKpiTiles({ kpis, range }: AgentKpiTilesProps) {
  const totalActive = kpis.running + kpis.queued + kpis.paused;
  const totalInRange = kpis.doneInRange + kpis.failedInRange;
  const avgCycleLabel = formatDuration(kpis.avgCycleMsInRange);
  const rangeDescription = `Finished ${range.shortLabel}`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard
        icon={<Activity className="size-3.5" />}
        label="Active"
        value={totalActive}
        description="Agent runs in progress"
      >
        <StackedBar
          segments={[
            { key: "running", value: kpis.running, color: "bg-blue-500" },
            { key: "queued", value: kpis.queued, color: "bg-slate-400 dark:bg-slate-500" },
            { key: "paused", value: kpis.paused, color: "bg-amber-500" },
          ]}
        />
        <Legend
          items={[
            { color: "bg-blue-500", label: "Running", value: kpis.running },
            {
              color: "bg-slate-400 dark:bg-slate-500",
              label: "Queued",
              value: kpis.queued,
            },
            { color: "bg-amber-500", label: "Paused", value: kpis.paused },
          ]}
        />
      </MetricCard>

      <MetricCard
        icon={<CheckCircle2 className="size-3.5" />}
        label="Completed"
        value={totalInRange}
        description={
          kpis.avgCycleMsInRange > 0
            ? `${range.label} · avg ${avgCycleLabel}`
            : rangeDescription
        }
      >
        <StackedBar
          segments={[
            { key: "done", value: kpis.doneInRange, color: "bg-green-500" },
            { key: "failed", value: kpis.failedInRange, color: "bg-red-500" },
          ]}
        />
        <Legend
          items={[
            { color: "bg-green-500", label: "Success", value: kpis.doneInRange },
            { color: "bg-red-500", label: "Failed", value: kpis.failedInRange },
          ]}
        />
      </MetricCard>

      <MetricCard
        icon={<Sparkles className="size-3.5" />}
        label="Health"
        value={`${kpis.successRateInRange}%`}
        description={`Success rate (${range.shortLabel})`}
      >
        <GradientBar percent={kpis.successRateInRange} />
        <Legend
          items={[
            {
              color: "bg-green-500",
              label: "Success",
              value: kpis.doneInRange,
            },
            {
              color: "bg-red-500",
              label: "Failed",
              value: kpis.failedInRange,
            },
          ]}
        />
      </MetricCard>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  description: string;
  children: React.ReactNode;
}

function MetricCard({
  icon,
  label,
  value,
  description,
  children,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums leading-none">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

interface BarSegment {
  key: string;
  value: number;
  color: string;
}

function StackedBar({ segments }: { segments: BarSegment[] }) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-muted/60" />;
  }
  return (
    <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
      {segments.map((seg) =>
        seg.value === 0 ? null : (
          <div
            key={seg.key}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", seg.color)}
            style={{ width: `${(seg.value / total) * 100}%` }}
          />
        )
      )}
    </div>
  );
}

function GradientBar({ percent }: { percent: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
      <div
        className="h-full rounded-full bg-gradient-to-r from-green-400 via-green-500 to-green-600"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface LegendItem {
  color: string;
  label: string;
  value: number;
}

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", item.color)} />
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "—";
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round((mins / 60) * 10) / 10;
  if (hours < 24) return `${hours}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}

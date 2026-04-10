"use client";

import { useMemo, useState } from "react";
import { useAgentRuns } from "@/hooks/use-agent-runs";
import { AgentKpiTiles } from "./agent-kpi-tiles";
import { PrAttentionCard } from "./pr-attention-card";
import { AgentStageFunnel } from "./agent-stage-funnel";
import { ActiveRunsList } from "./active-runs-list";
import { ScheduledAgentsCard } from "./scheduled-agents-card";
import { RecentlyCompletedList } from "./recently-completed-list";
import { AgentRunDrawer } from "./agent-run-drawer";
import { DateRangeSelector } from "./date-range-selector";
import {
  computeDateRange,
  type DateRangePreset,
} from "@/lib/agents/date-range";
import type { AgentKind, AgentRun } from "@/types/agents";

const ALL_KINDS: Set<AgentKind> = new Set([
  "claude-work",
  "claude-review",
  "gh-action",
]);

export function AgentsControlRoom() {
  const [rangePreset, setRangePreset] = useState<DateRangePreset>("today");
  const range = useMemo(() => computeDateRange(rangePreset), [rangePreset]);

  const {
    activeRuns,
    completedRuns,
    scheduledAgents,
    kpis,
    stageCounts,
    isLoading,
  } = useAgentRuns(range);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<Set<AgentKind>>(
    new Set(ALL_KINDS)
  );

  const filteredActiveRuns = useMemo(() => {
    return activeRuns.filter((run) => {
      if (kindFilter.size > 0 && !kindFilter.has(run.kind)) return false;
      if (activeStage) {
        const currentStage = run.stages[run.currentStageIndex];
        if (currentStage?.def.label !== activeStage) return false;
      }
      return true;
    });
  }, [activeRuns, kindFilter, activeStage]);

  const recentGhActionRuns = useMemo(
    () =>
      completedRuns.filter((run) => run.kind === "gh-action"),
    [completedRuns]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Agents</h2>
          <p className="text-sm text-muted-foreground">
            Everything your automated agents are doing, right now.
          </p>
        </div>
        <DateRangeSelector value={rangePreset} onChange={setRangePreset} />
      </div>
      <AgentKpiTiles kpis={kpis} range={range} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <RecentlyCompletedList
            runs={recentGhActionRuns}
            onRunClick={setSelectedRun}
            title="Recently completed Actions"
            emptyMessage={`No GitHub Actions completed ${range.shortLabel}`}
            rangeLabel={range.shortLabel}
            heightClassName="h-[490px]"
          />
        </div>
        <div className="lg:col-span-2">
          <PrAttentionCard />
        </div>
      </div>
      <AgentStageFunnel
        stageCounts={stageCounts}
        activeStage={activeStage}
        onStageClick={setActiveStage}
        kindFilter={kindFilter}
        onKindFilterChange={setKindFilter}
      />
      <ActiveRunsList
        runs={filteredActiveRuns}
        onRunClick={setSelectedRun}
      />
      <ScheduledAgentsCard scheduled={scheduledAgents} />
      <AgentRunDrawer run={selectedRun} onClose={() => setSelectedRun(null)} />
      {isLoading && activeRuns.length === 0 && (
        <div className="py-4 text-center text-xs text-muted-foreground">
          Loading agents…
        </div>
      )}
    </div>
  );
}

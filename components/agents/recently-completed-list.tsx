"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentRunRow } from "./agent-run-row";
import { cn } from "@/lib/utils";
import type { AgentRun } from "@/types/agents";

interface RecentlyCompletedListProps {
  runs: AgentRun[];
  onRunClick: (run: AgentRun) => void;
  title?: string;
  emptyMessage?: string;
  /** Label shown in the header subtitle — defaults to "last 24h". */
  rangeLabel?: string;
  heightClassName?: string;
  className?: string;
}

export function RecentlyCompletedList({
  runs,
  onRunClick,
  title = "Recently completed",
  emptyMessage = "No runs completed in the last 24 hours",
  rangeLabel = "last 24h",
  heightClassName = "h-[380px]",
  className,
}: RecentlyCompletedListProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            ({rangeLabel} · {runs.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <ScrollArea className={cn("-mr-3 pr-3", heightClassName)}>
            <div className="flex flex-col gap-2">
              {runs.map((run) => (
                <AgentRunRow key={run.id} run={run} onClick={onRunClick} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentRunRow } from "./agent-run-row";
import type { AgentRun } from "@/types/agents";

interface ActiveRunsListProps {
  runs: AgentRun[];
  onRunClick: (run: AgentRun) => void;
}

export function ActiveRunsList({ runs, onRunClick }: ActiveRunsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Active runs
          <span className="text-xs font-normal text-muted-foreground">
            ({runs.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="size-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No agents currently running
            </p>
          </div>
        ) : runs.length > 8 ? (
          <ScrollArea className="h-[600px] -mr-3 pr-3">
            <div className="flex flex-col gap-2">
              {runs.map((run) => (
                <AgentRunRow key={run.id} run={run} onClick={onRunClick} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map((run) => (
              <AgentRunRow key={run.id} run={run} onClick={onRunClick} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

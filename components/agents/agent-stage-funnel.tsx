"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AgentKind } from "@/types/agents";

interface AgentStageFunnelProps {
  stageCounts: Record<string, number>;
  activeStage: string | null;
  onStageClick: (stage: string | null) => void;
  kindFilter: Set<AgentKind>;
  onKindFilterChange: (kinds: Set<AgentKind>) => void;
}

const ALL_KINDS: { value: AgentKind; label: string }[] = [
  { value: "claude-work", label: "Claude Work" },
  { value: "claude-review", label: "Claude Review" },
  { value: "gh-action", label: "GitHub Actions" },
];

export function AgentStageFunnel({
  stageCounts,
  activeStage,
  onStageClick,
  kindFilter,
  onKindFilterChange,
}: AgentStageFunnelProps) {
  const entries = Object.entries(stageCounts);
  const kindLabel =
    kindFilter.size === 0 || kindFilter.size === ALL_KINDS.length
      ? "All kinds"
      : ALL_KINDS.filter((k) => kindFilter.has(k.value))
          .map((k) => k.label)
          .join(", ");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Stages:</span>
      {entries.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          No active runs to group
        </span>
      ) : (
        entries.map(([stage, count]) => {
          const isActive = activeStage === stage;
          return (
            <Button
              key={stage}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 gap-1.5 px-2 text-xs",
                isActive && "bg-accent"
              )}
              onClick={() => onStageClick(isActive ? null : stage)}
            >
              {stage}
              <Badge
                variant="outline"
                className="h-4 min-w-4 justify-center px-1 text-[10px] tabular-nums"
              >
                {count}
              </Badge>
            </Button>
          );
        })
      )}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
              {kindLabel}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by kind</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_KINDS.map((k) => (
              <DropdownMenuCheckboxItem
                key={k.value}
                checked={kindFilter.size === 0 || kindFilter.has(k.value)}
                onCheckedChange={(checked) => {
                  const next = new Set(kindFilter);
                  if (next.size === 0) {
                    // currently "all" implicit state → initialise to all
                    ALL_KINDS.forEach((kk) => next.add(kk.value));
                  }
                  if (checked) next.add(k.value);
                  else next.delete(k.value);
                  onKindFilterChange(next);
                }}
              >
                {k.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

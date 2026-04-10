"use client";

import { Pause, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STAGE_BLOCK_CLASSES } from "@/lib/agents/stage-model";
import type { AgentStage } from "@/types/agents";

interface AgentPipelineRailProps {
  stages: AgentStage[];
  size?: "sm" | "md";
  showCodes?: boolean;
}

/**
 * Renders a stage pipeline as a row of rounded square BLOCKS (not dots).
 * Each block is self-contained (no connecting rails between) and filled
 * with its stage status colour. Inspired by the tool-chip grid in the
 * Apiiro reference dashboard.
 */
export function AgentPipelineRail({
  stages,
  size = "sm",
  showCodes = true,
}: AgentPipelineRailProps) {
  if (stages.length === 0) {
    return (
      <div className="flex h-6 items-center text-xs text-muted-foreground">
        No stages
      </div>
    );
  }

  const blockSize = size === "md" ? "size-7" : "size-6";
  const fontSize = size === "md" ? "text-[11px]" : "text-[10px]";
  const iconSize = size === "md" ? "size-3.5" : "size-3";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        {stages.map((stage, idx) => (
          <Tooltip key={`${stage.def.code}-${idx}`}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md font-semibold transition-all",
                  blockSize,
                  fontSize,
                  STAGE_BLOCK_CLASSES[stage.status]
                )}
                aria-label={`${stage.def.label}: ${stage.status}`}
              >
                {stage.status === "failed" ? (
                  <X className={iconSize} strokeWidth={3} />
                ) : stage.status === "paused" ? (
                  <Pause className={iconSize} strokeWidth={3} />
                ) : showCodes ? (
                  stage.def.code
                ) : null}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="text-xs">
                <div className="font-semibold">{stage.def.label}</div>
                <div className="capitalize text-muted-foreground">
                  {stage.status}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

"use client";

import { LayoutList, Columns3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ViewSwitcherProps {
  view: "table" | "kanban";
  onViewChange: (view: "table" | "kanban") => void;
}

export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => v && onViewChange(v as "table" | "kanban")}
      className="h-8"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 px-0">
            <LayoutList className="size-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Table view</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="kanban" aria-label="Kanban view" className="h-8 w-8 px-0">
            <Columns3 className="size-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Kanban view</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}

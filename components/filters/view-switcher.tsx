"use client";

import { List, LayoutList, Columns3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ViewType = "list" | "table" | "kanban";

interface ViewSwitcherProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(v) => v && onViewChange(v as ViewType)}
      className="h-8"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 px-0">
            <List className="size-4" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>List view</TooltipContent>
      </Tooltip>
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

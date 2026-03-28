"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssuePriorityBadge } from "./issue-priority-badge";
import { PRIORITY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useState } from "react";

const priorityValues = PRIORITY_LABELS.map((l) => l.name.replace("priority: ", ""));

interface IssuePriorityEditorProps {
  currentPriority: string | null;
  allLabels: string[];
  onUpdate: (labels: string[]) => void;
  disabled?: boolean;
}

export function IssuePriorityEditor({
  currentPriority,
  allLabels,
  onUpdate,
  disabled,
}: IssuePriorityEditorProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(priority: string) {
    const nonPriorityLabels = allLabels.filter(
      (l) => !l.startsWith("priority: ")
    );
    const newLabels = [...nonPriorityLabels, `priority: ${priority}`];
    onUpdate(newLabels);
    setOpen(false);
  }

  function handleClear() {
    const nonPriorityLabels = allLabels.filter(
      (l) => !l.startsWith("priority: ")
    );
    onUpdate(nonPriorityLabels);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1" disabled={disabled}>
          <IssuePriorityBadge priority={currentPriority} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {priorityValues.map((p) => (
          <button
            key={p}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
            )}
            onClick={() => handleSelect(p)}
          >
            <Check
              className={cn(
                "size-3.5",
                currentPriority === p ? "opacity-100" : "opacity-0"
              )}
            />
            <IssuePriorityBadge priority={p} />
          </button>
        ))}
        {currentPriority && (
          <>
            <div className="my-1 border-t" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent pl-[30px]"
              onClick={() => handleClear()}
            >
              Remove priority
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

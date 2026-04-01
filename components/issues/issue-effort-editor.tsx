"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssueEffortBadge } from "./issue-effort-badge";
import { EFFORT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useState } from "react";

const effortValues = EFFORT_LABELS.map((l) => l.name.replace("effort: ", ""));

interface IssueEffortEditorProps {
  currentEffort: string | null;
  allLabels: string[];
  onUpdate: (labels: string[]) => void;
  disabled?: boolean;
}

export function IssueEffortEditor({
  currentEffort,
  allLabels,
  onUpdate,
  disabled,
}: IssueEffortEditorProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(effort: string) {
    const nonEffortLabels = allLabels.filter(
      (l) => !l.startsWith("effort: ")
    );
    onUpdate([...nonEffortLabels, `effort: ${effort}`]);
    setOpen(false);
  }

  function handleClear() {
    onUpdate(allLabels.filter((l) => !l.startsWith("effort: ")));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1" disabled={disabled}>
          <IssueEffortBadge effort={currentEffort} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {effortValues.map((e) => (
          <button
            key={e}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => handleSelect(e)}
          >
            <Check
              className={cn(
                "size-3.5",
                currentEffort === e ? "opacity-100" : "opacity-0"
              )}
            />
            <IssueEffortBadge effort={e} />
          </button>
        ))}
        {currentEffort && (
          <>
            <div className="mt-1 border-t" />
            <button
              type="button"
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent pl-[30px]"
              onMouseDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
            >
              Remove effort
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

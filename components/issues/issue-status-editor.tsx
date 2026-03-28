"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssueStatusBadge } from "./issue-status-badge";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useState } from "react";

const statusValues = STATUS_LABELS.map((l) => l.name.replace("status: ", ""));

interface IssueStatusEditorProps {
  currentStatus: string | null;
  allLabels: string[];
  onUpdate: (labels: string[]) => void;
  disabled?: boolean;
}

export function IssueStatusEditor({
  currentStatus,
  allLabels,
  onUpdate,
  disabled,
}: IssueStatusEditorProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(status: string) {
    const nonStatusLabels = allLabels.filter(
      (l) => !l.startsWith("status: ")
    );
    const newLabels = [...nonStatusLabels, `status: ${status}`];
    onUpdate(newLabels);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1" disabled={disabled}>
          <IssueStatusBadge status={currentStatus} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {statusValues.map((s) => (
          <button
            key={s}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
            )}
            onClick={() => handleSelect(s)}
          >
            <Check
              className={cn(
                "size-3.5",
                currentStatus === s ? "opacity-100" : "opacity-0"
              )}
            />
            <IssueStatusBadge status={s} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

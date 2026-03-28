"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SnoozePopoverProps {
  onSnooze: (until: string | null, wakeOnActivity: boolean) => void;
  disabled?: boolean;
}

export function SnoozePopover({ onSnooze, disabled }: SnoozePopoverProps) {
  const [open, setOpen] = useState(false);

  function handlePick(date: Date | null, wakeOnActivity: boolean) {
    onSnooze(date ? date.toISOString() : null, wakeOnActivity);
    setOpen(false);
  }

  const tomorrow = addDays(new Date(), 1);
  const nextWeek = addWeeks(new Date(), 1);
  const nextMonth = addMonths(new Date(), 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <Clock className="mr-1.5 size-3.5" />
          Snooze
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <button
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          onClick={() => handlePick(tomorrow, false)}
        >
          Tomorrow
          <span className="ml-auto text-xs text-muted-foreground">
            {format(tomorrow, "MMM d")}
          </span>
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          onClick={() => handlePick(nextWeek, false)}
        >
          Next week
          <span className="ml-auto text-xs text-muted-foreground">
            {format(nextWeek, "MMM d")}
          </span>
        </button>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          onClick={() => handlePick(nextMonth, false)}
        >
          Next month
          <span className="ml-auto text-xs text-muted-foreground">
            {format(nextMonth, "MMM d")}
          </span>
        </button>
        <div className="my-1 border-t" />
        <button
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
          onClick={() => handlePick(null, true)}
        >
          Until new activity
        </button>
      </PopoverContent>
    </Popover>
  );
}

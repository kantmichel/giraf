"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns";

interface WeekNavigatorProps {
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
}

export function WeekNavigator({ weekOffset, onWeekOffsetChange }: WeekNavigatorProps) {
  const { label } = useMemo(() => {
    const target = addWeeks(new Date(), weekOffset);
    const start = startOfWeek(target, { weekStartsOn: 1 });
    const end = endOfWeek(target, { weekStartsOn: 1 });

    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const label =
      startYear !== endYear
        ? `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`
        : `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;

    return { label };
  }, [weekOffset]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => onWeekOffsetChange(weekOffset - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[170px] text-center text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={weekOffset >= 0}
        onClick={() => onWeekOffsetChange(weekOffset + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

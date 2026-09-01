"use client";

import { ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IssueSortDir } from "@/hooks/use-filter-state";

interface DateSortToggleProps {
  value: IssueSortDir;
  onChange: (dir: IssueSortDir) => void;
  /** Which date the list is ordered by — shown in the tooltip. */
  dateLabel?: string;
}

/** Flips the issue list between newest-first and oldest-first. */
export function DateSortToggle({ value, onChange, dateLabel = "created" }: DateSortToggleProps) {
  const next: IssueSortDir = value === "newest" ? "oldest" : "newest";

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => onChange(next)}
      title={`Sorted by ${dateLabel} date, ${value} first — click for ${next} first`}
    >
      {value === "newest" ? (
        <ArrowDownNarrowWide className="size-4" />
      ) : (
        <ArrowUpNarrowWide className="size-4" />
      )}
      {value === "newest" ? "Newest" : "Oldest"}
    </Button>
  );
}

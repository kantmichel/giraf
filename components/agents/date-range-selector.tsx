"use client";

import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DATE_RANGE_PRESETS,
  computeDateRange,
  type DateRangePreset,
} from "@/lib/agents/date-range";

interface DateRangeSelectorProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
  /** Override the default preset list (e.g. for charts that want their own time scale). */
  presets?: DateRangePreset[];
}

export function DateRangeSelector({
  value,
  onChange,
  presets,
}: DateRangeSelectorProps) {
  const items = presets ?? DATE_RANGE_PRESETS;
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRangePreset)}>
      <SelectTrigger className="h-8 gap-1.5 px-2.5 text-xs">
        <CalendarRange className="size-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {items.map((preset) => (
          <SelectItem key={preset} value={preset} className="text-xs">
            {computeDateRange(preset).label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

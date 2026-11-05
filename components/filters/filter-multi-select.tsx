"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterMultiSelectProps {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  groups?: { label: string; options: { value: string; label: string }[] }[];
  /**
   * How many issues each value has under the other filters (facetCounts).
   * When given, a value with none is left out, unless it is selected (so it
   * can still be unticked), and each option shows its count.
   */
  counts?: Map<string, number>;
}

type Option = { value: string; label: string };

export function FilterMultiSelect({
  title,
  options,
  selected,
  onSelectionChange,
  groups,
  counts,
}: FilterMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const shown = (list: Option[]) =>
    counts ? list.filter((o) => (counts.get(o.value) ?? 0) > 0 || selected.includes(o.value)) : list;
  const shownGroups = groups?.map((g) => ({ ...g, options: shown(g.options) })).filter((g) => g.options.length > 0);

  function handleToggle(value: string) {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((s) => s !== value));
    } else {
      onSelectionChange([...selected, value]);
    }
  }

  const item = (option: Option) => {
    const isSelected = selected.includes(option.value);
    return (
      // Searched by its label only, not the count beside it.
      <CommandItem key={option.value} value={option.value} keywords={[option.label]} onSelect={() => handleToggle(option.value)}>
        <div
          className={cn(
            "mr-2 flex size-4 items-center justify-center rounded-sm border",
            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
          )}
        >
          {isSelected && <Check className="size-3" />}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
        {counts && (
          <span className="ml-2 shrink-0 text-xs tabular-nums text-muted-foreground">
            {counts.get(option.value) ?? 0}
          </span>
        )}
      </CommandItem>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          {title}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {selected.length}
            </Badge>
          )}
          <ChevronsUpDown className="ml-1 size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Filter ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {shownGroups
              ? shownGroups.map((group) => (
                  <CommandGroup key={group.label} heading={group.label}>
                    {group.options.map(item)}
                  </CommandGroup>
                ))
              : (
                <CommandGroup>
                  {shown(options).map(item)}
                </CommandGroup>
              )}
          </CommandList>
          {selected.length > 0 && (
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => onSelectionChange([])}
              >
                <X className="mr-1 size-3" />
                Clear
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

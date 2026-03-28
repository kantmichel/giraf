"use client";

import { useState } from "react";
import { Check, Tag } from "lucide-react";
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
import { useLabels } from "@/hooks/use-labels";
import { cn } from "@/lib/utils";

interface IssueLabelsEditorProps {
  owner: string;
  repo: string;
  currentLabels: string[];
  onUpdate: (labels: string[]) => void;
  disabled?: boolean;
}

export function IssueLabelsEditor({
  owner,
  repo,
  currentLabels,
  onUpdate,
  disabled,
}: IssueLabelsEditorProps) {
  const [open, setOpen] = useState(false);
  const { data: availableLabels } = useLabels(owner, repo);
  const currentSet = new Set(currentLabels);

  function handleToggle(labelName: string) {
    const next = new Set(currentSet);
    if (next.has(labelName)) {
      next.delete(labelName);
    } else {
      next.add(labelName);
    }
    onUpdate([...next]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 p-1" disabled={disabled}>
          {currentLabels.length > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="size-3.5" /> {currentLabels.length} labels
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="size-3.5" /> Labels
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels..." />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            <CommandGroup>
              {availableLabels?.map((l) => (
                <CommandItem
                  key={l.id}
                  onSelect={() => handleToggle(l.name)}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      currentSet.has(l.name) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Badge
                    variant="outline"
                    className="mr-2 text-[10px] font-normal"
                    style={{
                      borderColor: `#${l.color}`,
                      backgroundColor: `#${l.color}20`,
                    }}
                  >
                    {l.name}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

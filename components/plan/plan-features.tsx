import { useState } from "react";
import { ArrowLeft, ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { featureKey } from "@/lib/work-kind";
import type { FeatureProject } from "@/lib/github/projects";

/**
 * The month's features, in the order they get worked on. Order matters: the
 * first feature's tickets fill the feature hours before the second's start.
 */
export function PlanFeatures({
  selected,
  projects,
  onChange,
}: {
  selected: string[];
  projects: FeatureProject[];
  onChange: (features: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const byKey = new Map(projects.map((p) => [featureKey(p), p]));
  const available = projects
    .filter((p) => !selected.includes(featureKey(p)))
    .sort((a, b) => a.title.localeCompare(b.title));

  const move = (index: number) => {
    const next = [...selected];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Features</span>
      {selected.map((key, i) => {
        const project = byKey.get(key);
        return (
          <Badge key={key} variant="secondary" className="gap-1 py-1 pl-2 pr-1 text-xs font-normal">
            <span className="tabular-nums text-muted-foreground">{i + 1}.</span>
            {project ? (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                {project.title}
                <span className="text-muted-foreground">({project.items.length})</span>
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            ) : (
              // Closed, deleted, or not readable with this sign-in.
              <span className="text-muted-foreground">Project {key} (not found)</span>
            )}
            {i > 0 && (
              <button type="button" onClick={() => move(i)} className="rounded p-0.5 hover:bg-background" aria-label="Move earlier">
                <ArrowLeft className="size-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(selected.filter((k) => k !== key))}
              className="rounded p-0.5 hover:bg-background"
              aria-label="Remove feature"
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <Plus className="size-3" /> Add feature
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Find a Project…" />
            <CommandList>
              <CommandEmpty>No open Projects left.</CommandEmpty>
              <CommandGroup>
                {available.map((p) => (
                  <CommandItem
                    key={featureKey(p)}
                    value={`${p.title} ${p.number}`}
                    onSelect={() => {
                      onChange([...selected, featureKey(p)]);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{p.items.length}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

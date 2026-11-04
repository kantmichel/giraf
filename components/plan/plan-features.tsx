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
import { formatMonthShort } from "@/lib/format-date";
import { formatHours } from "@/lib/month-plan";
import type { FeatureProject } from "@/lib/github/projects";

/** A Project's size and where it's planned, for picking it. */
export interface ProjectSize {
  /** Open hours left, everyone's together. */
  hours: number;
  /** Months whose features include it. */
  months: string[];
}

/**
 * The month's features, in the order they get worked on. Order matters: the
 * first feature's tickets fill the feature hours before the second's start.
 * A Project carried on from an earlier month is added before new ones.
 * Projects show their hours left, so a big one stands out; one planned in
 * another month is greyed, not disabled, since it can go in this one too.
 */
export function PlanFeatures({
  month,
  selected,
  projects,
  sizes,
  onChange,
  onAdd,
}: {
  month: string;
  selected: string[];
  projects: FeatureProject[];
  /** Per Project key; missing while the issues load. */
  sizes: Map<string, ProjectSize>;
  onChange: (features: string[]) => void;
  /** Adding goes through the page, which knows where it belongs (withFeature). */
  onAdd: (key: string) => void;
}) {
  const sizeLabel = (key: string) => {
    const size = sizes.get(key);
    return size ? (size.hours > 0 ? formatHours(size.hours) : "done") : "";
  };
  const plannedElsewhere = (key: string) => (sizes.get(key)?.months ?? []).filter((m) => m !== month);
  const monthList = (months: string[]) =>
    months.map((m) => formatMonthShort(m, m.slice(0, 4) !== month.slice(0, 4))).join(", ");
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
                {sizeLabel(key) && <span className="tabular-nums text-muted-foreground">({sizeLabel(key)})</span>}
                <ExternalLink className="size-3 text-muted-foreground" />
              </a>
            ) : (
              // Closed, deleted, or not readable with this sign-in.
              <span className="text-muted-foreground">Project {key} (not found)</span>
            )}
            {project?.epic && (
              <a
                href={`https://github.com/${project.epic.owner}/${project.epic.repo}/issues/${project.epic.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border border-[#7057ff]/40 px-1 text-[10px] font-medium uppercase tracking-wide text-[#7057ff] hover:bg-background"
                title={`Read the epic: ${project.epic.repo}#${project.epic.number}`}
              >
                Epic
              </a>
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
        <PopoverContent className="w-96 p-0" align="start">
          <Command>
            <CommandInput placeholder="Find a Project…" />
            <CommandList>
              <CommandEmpty>No open Projects left.</CommandEmpty>
              <CommandGroup>
                {available.map((p) => {
                  const key = featureKey(p);
                  const elsewhere = plannedElsewhere(key);
                  return (
                    <CommandItem
                      key={key}
                      value={`${p.title} ${p.number}`}
                      onSelect={() => {
                        onAdd(key);
                        setOpen(false);
                      }}
                      className={elsewhere.length ? "text-muted-foreground" : undefined}
                      title={elsewhere.length ? `Planned in ${monthList(elsewhere)}` : undefined}
                    >
                      <span className="min-w-0 truncate">{p.title}</span>
                      {elsewhere.length > 0 && <span className="shrink-0 text-xs">{monthList(elsewhere)}</span>}
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{sizeLabel(key)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

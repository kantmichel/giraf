"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { FilterMultiSelect } from "./filter-multi-select";
import { FilterSearch } from "./filter-search";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import type { FilterConfig, NormalizedIssue } from "@/types/github";
import type { TrackedRepoRow } from "@/types/github";

interface FilterBarProps {
  filters: FilterConfig;
  onFilterChange: (updates: Partial<FilterConfig>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  trackedRepos: TrackedRepoRow[];
  allIssues: NormalizedIssue[];
}

export function FilterBar({
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
  trackedRepos,
  allIssues,
}: FilterBarProps) {
  const repoOptions = useMemo(
    () =>
      trackedRepos.map((r) => ({
        value: `${r.owner}/${r.repo}`,
        label: `${r.owner}/${r.repo}`,
      })),
    [trackedRepos]
  );

  const statusOptions = STATUS_LABELS.map((l) => ({
    value: l.name.replace("status: ", ""),
    label: l.name.replace("status: ", ""),
  }));

  const priorityOptions = PRIORITY_LABELS.map((l) => ({
    value: l.name.replace("priority: ", ""),
    label: l.name.replace("priority: ", ""),
  }));

  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const issue of allIssues) {
      for (const a of issue.assignees) {
        if (!seen.has(a.login)) {
          seen.add(a.login);
          options.push({ value: a.login, label: a.login });
        }
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [allIssues]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMultiSelect
        title="Repo"
        options={repoOptions}
        selected={filters.repos}
        onSelectionChange={(repos) => onFilterChange({ repos })}
      />
      <FilterMultiSelect
        title="Status"
        options={statusOptions}
        selected={filters.status}
        onSelectionChange={(status) => onFilterChange({ status })}
      />
      <FilterMultiSelect
        title="Priority"
        options={priorityOptions}
        selected={filters.priority}
        onSelectionChange={(priority) => onFilterChange({ priority })}
      />
      <FilterMultiSelect
        title="Assignee"
        options={assigneeOptions}
        selected={filters.assignees}
        onSelectionChange={(assignees) => onFilterChange({ assignees })}
      />
      <div className="flex items-center gap-0.5 rounded-md border p-0.5">
        {(["open", "closed", "all"] as const).map((s) => (
          <Toggle
            key={s}
            size="sm"
            pressed={filters.state === s}
            onPressedChange={() => onFilterChange({ state: s })}
            className="h-6 px-2 text-xs data-[state=on]:bg-accent"
          >
            {s}
          </Toggle>
        ))}
      </div>
      <FilterSearch
        value={filters.search}
        onChange={(search) => onFilterChange({ search })}
      />
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClear}>
          <X className="mr-1 size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}

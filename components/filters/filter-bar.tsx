"use client";

import { useMemo, useState } from "react";
import { X, SlidersHorizontal, GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { FilterMultiSelect } from "./filter-multi-select";
import { FilterSearch } from "./filter-search";
import { WeekNavigator } from "./week-navigator";
import { STATUS_LABELS, PRIORITY_LABELS, EFFORT_LABELS, AI_STATE_LABELS } from "@/lib/constants";
import type { FilterConfig, NormalizedIssue } from "@/types/github";
import type { TrackedRepoRow } from "@/types/github";

interface FilterBarProps {
  filters: FilterConfig;
  onFilterChange: (updates: Partial<FilterConfig>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  trackedRepos: TrackedRepoRow[];
  allIssues: NormalizedIssue[];
  weekOffset?: number;
  onWeekOffsetChange?: (offset: number) => void;
}

export function FilterBar({
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
  trackedRepos,
  allIssues,
  weekOffset,
  onWeekOffsetChange,
}: FilterBarProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const repoOptions = useMemo(
    () =>
      trackedRepos.map((r) => ({
        value: `${r.owner}/${r.repo}`,
        label: r.repo,
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

  const effortOptions = EFFORT_LABELS.map((l) => ({
    value: l.name.replace("effort: ", ""),
    label: l.name.replace("effort: ", ""),
  }));

  const aiOptions = AI_STATE_LABELS.map((l) => ({
    value: l.value,
    label: l.label,
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

  const versionData = useMemo(() => {
    const source = filters.repos.length > 0
      ? allIssues.filter((i) => filters.repos.includes(i.repo.fullName))
      : allIssues;

    const byRepo = new Map<string, Set<string>>();
    for (const issue of source) {
      if (!issue.version) continue;
      const repo = issue.repo.name;
      if (!byRepo.has(repo)) byRepo.set(repo, new Set());
      byRepo.get(repo)!.add(issue.version);
    }

    const groups = Array.from(byRepo.entries())
      .map(([repo, versions]) => ({
        label: repo,
        options: Array.from(versions).sort().reverse().map((v) => ({ value: v, label: v })),
      }))
      .filter((g) => g.options.length > 0);

    const flat = Array.from(
      new Set(source.filter((i) => i.version).map((i) => i.version!))
    ).sort().reverse().map((v) => ({ value: v, label: v }));

    return { groups, flat };
  }, [allIssues, filters.repos]);

  const activeCount =
    filters.repos.length +
    filters.status.length +
    filters.priority.length +
    filters.ai.length +
    filters.version.length +
    filters.assignees.length +
    (filters.hasPr ? 1 : 0) +
    (filters.search ? 1 : 0) +
    (filters.state !== "open" ? 1 : 0);

  const filterControls = (
    <>
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
        title="Effort"
        options={effortOptions}
        selected={filters.effort}
        onSelectionChange={(effort) => onFilterChange({ effort })}
      />
      <FilterMultiSelect
        title="AI"
        options={aiOptions}
        selected={filters.ai}
        onSelectionChange={(ai) => onFilterChange({ ai })}
      />
      {versionData.flat.length > 0 && (
        <FilterMultiSelect
          title="Version"
          options={versionData.flat}
          groups={versionData.groups.length > 1 ? versionData.groups : undefined}
          selected={filters.version}
          onSelectionChange={(version) => onFilterChange({ version })}
        />
      )}
      <FilterMultiSelect
        title="Assignee"
        options={assigneeOptions}
        selected={filters.assignees}
        onSelectionChange={(assignees) => onFilterChange({ assignees })}
      />
      <Toggle
        size="sm"
        pressed={filters.hasPr}
        onPressedChange={(pressed) => onFilterChange({ hasPr: pressed })}
        className="h-8 gap-1 border px-2 text-xs data-[state=on]:bg-accent"
      >
        <GitPullRequest className="size-3.5" />
        PR
      </Toggle>
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
      {filters.state === "closed" && weekOffset !== undefined && onWeekOffsetChange && (
        <WeekNavigator weekOffset={weekOffset} onWeekOffsetChange={onWeekOffsetChange} />
      )}
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
    </>
  );

  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setMobileOpen(true)}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
          <FilterSearch
            value={filters.search}
            onChange={(search) => onFilterChange({ search })}
          />
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="max-h-[70vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Filter issues by repo, status, priority, and more.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-wrap gap-2 py-4">
              {filterControls}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filterControls}
    </div>
  );
}

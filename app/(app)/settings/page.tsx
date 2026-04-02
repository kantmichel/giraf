"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List, LayoutList, Columns3, ArrowDownNarrowWide, ArrowUpNarrowWide } from "lucide-react";
import { FilterMultiSelect } from "@/components/filters/filter-multi-select";
import { STATUS_LABELS, PRIORITY_LABELS, EFFORT_LABELS, AI_STATE_LABELS } from "@/lib/constants";
import { useIssues } from "@/hooks/use-issues";
import { useTrackedRepos } from "@/hooks/use-tracked-repos";
import { useClaudeEnabledRepos, useToggleClaudeRepo } from "@/hooks/use-claude-repos";
import { usePreferences, useUpdatePreferences } from "@/hooks/use-preferences";
import type { ViewType } from "@/components/filters/view-switcher";
import type { SortField, SortDirection, ColumnSort } from "@/components/kanban/kanban-board";
import type { NormalizedUser, FilterConfig } from "@/types/github";

interface Budget {
  critical_max: number;
  high_max: number;
  medium_max: number;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], ai: [], hasPr: false, milestone: [], search: "" });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget>({ critical_max: 2, high_max: 3, medium_max: 5 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get unique assignees from all issues
  const assignees = Array.from(
    new Map(
      allIssues.flatMap((i) => i.assignees).map((a) => [a.login, a])
    ).values()
  ).sort((a, b) => a.login.localeCompare(b.login));

  // Auto-select current user
  useEffect(() => {
    if (!selectedUser && session?.user?.githubUsername) {
      setSelectedUser(session.user.githubUsername);
    }
  }, [session, selectedUser]);

  // Load budget when user changes
  useEffect(() => {
    if (!selectedUser) return;
    setLoading(true);
    fetch("/api/settings/budgets")
      .then((r) => r.json())
      .then((budgets) => {
        const userBudget = budgets.find(
          (b: { github_user_id: string }) => b.github_user_id === selectedUser
        );
        if (userBudget) {
          setBudget({
            critical_max: userBudget.critical_max,
            high_max: userBudget.high_max,
            medium_max: userBudget.medium_max,
          });
        } else {
          setBudget({ critical_max: 2, high_max: 3, medium_max: 5 });
        }
      })
      .finally(() => setLoading(false));
  }, [selectedUser]);

  async function handleSave() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUserId: selectedUser, ...budget }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success(`Budget saved for ${selectedUser}`);
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure priority budgets and auto-promotion rules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Priority Budgets</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set the maximum number of issues at each priority level per person.
            When a task is completed, the system automatically promotes the oldest
            lower-priority task to fill the gap.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-xs text-muted-foreground">Select user</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {assignees.length === 0 && (
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-32" />
                </div>
              )}
              {assignees.map((a: NormalizedUser) => (
                <Button
                  key={a.login}
                  variant={selectedUser === a.login ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setSelectedUser(a.login)}
                >
                  <Avatar className="size-5">
                    <AvatarImage src={a.avatarUrl} alt={a.login} />
                    <AvatarFallback className="text-[8px]">{a.login[0]}</AvatarFallback>
                  </Avatar>
                  {a.login}
                </Button>
              ))}
            </div>
          </div>

          {selectedUser && (
            <>
              <Separator />
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">
                        <span className="inline-block size-2 rounded-full bg-red-500 mr-1" />
                        Critical max
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={budget.critical_max}
                        onChange={(e) =>
                          setBudget({ ...budget, critical_max: parseInt(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <span className="inline-block size-2 rounded-full bg-orange-500 mr-1" />
                        High max
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={budget.high_max}
                        onChange={(e) =>
                          setBudget({ ...budget, high_max: parseInt(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        <span className="inline-block size-2 rounded-full bg-yellow-500 mr-1" />
                        Medium max
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        value={budget.medium_max}
                        onChange={(e) =>
                          setBudget({ ...budget, medium_max: parseInt(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Everything else is automatically low. When a high task is completed,
                    the oldest medium task in "to do" gets promoted to high.
                    Critical tasks are never auto-promoted.
                  </p>
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    <Save className="mr-1.5 size-3.5" />
                    {saving ? "Saving..." : "Save budget"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PreferredViewSettings />

      <DefaultFiltersSettings />

      <ClaudeReposSettings />
    </div>
  );
}

function DefaultFiltersSettings() {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const { data: trackedRepos } = useTrackedRepos();
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], ai: [], hasPr: false, milestone: [], search: "" });

  const defaults = prefs?.default_filters ?? {};

  function update(patch: Partial<FilterConfig>) {
    const next = { ...defaults, ...patch };
    // Clean out empty arrays and default values
    const cleaned: Partial<FilterConfig> = {};
    for (const [key, value] of Object.entries(next)) {
      if (Array.isArray(value) && value.length > 0) {
        (cleaned as Record<string, unknown>)[key] = value;
      } else if (key === "state" && value !== "open") {
        cleaned.state = value as FilterConfig["state"];
      }
    }
    updatePrefs.mutate({ default_filters: Object.keys(cleaned).length > 0 ? cleaned : null });
  }

  const repoOptions = (trackedRepos ?? []).map((r) => ({
    value: `${r.owner}/${r.repo}`,
    label: r.repo,
  }));

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

  const assigneeOptions = Array.from(
    new Map(allIssues.flatMap((i) => i.assignees).map((a) => [a.login, a])).values()
  )
    .sort((a, b) => a.login.localeCompare(b.login))
    .map((a) => ({ value: a.login, label: a.login }));

  const hasDefaults = prefs?.default_filters && Object.keys(prefs.default_filters).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Default Filters</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pre-select filters that auto-apply when opening the Issues page.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <FilterMultiSelect
                title="Repo"
                options={repoOptions}
                selected={defaults.repos ?? []}
                onSelectionChange={(repos) => update({ repos })}
              />
              <FilterMultiSelect
                title="Status"
                options={statusOptions}
                selected={defaults.status ?? []}
                onSelectionChange={(status) => update({ status })}
              />
              <FilterMultiSelect
                title="Priority"
                options={priorityOptions}
                selected={defaults.priority ?? []}
                onSelectionChange={(priority) => update({ priority })}
              />
              <FilterMultiSelect
                title="Effort"
                options={effortOptions}
                selected={defaults.effort ?? []}
                onSelectionChange={(effort) => update({ effort })}
              />
              <FilterMultiSelect
                title="AI"
                options={aiOptions}
                selected={defaults.ai ?? []}
                onSelectionChange={(ai) => update({ ai })}
              />
              <FilterMultiSelect
                title="Assignee"
                options={assigneeOptions}
                selected={defaults.assignees ?? []}
                onSelectionChange={(assignees) => update({ assignees })}
              />
              <div className="flex items-center gap-0.5 rounded-md border p-0.5">
                {(["open", "closed", "all"] as const).map((s) => (
                  <Toggle
                    key={s}
                    size="sm"
                    pressed={(defaults.state ?? "open") === s}
                    onPressedChange={() => update({ state: s })}
                    className="h-6 px-2 text-xs data-[state=on]:bg-accent"
                  >
                    {s}
                  </Toggle>
                ))}
              </div>
            </div>
            {hasDefaults && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => updatePrefs.mutate({ default_filters: null })}
              >
                <X className="mr-1 size-3" />
                Clear defaults
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClaudeReposSettings() {
  const { data: trackedRepos } = useTrackedRepos();
  const { enabledSet, isLoading } = useClaudeEnabledRepos();
  const toggleMutation = useToggleClaudeRepo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <img src="/claudecode-color.svg" alt="Claude" className="size-5" />
          Claude AI Workflows
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enable Claude AI review and work automation for repos that have the GitHub Actions workflows set up.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {trackedRepos?.map((repo) => {
              const key = `${repo.owner}/${repo.repo}`;
              const enabled = enabledSet.has(key);
              return (
                <label key={key} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent">
                  <Checkbox
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({
                        owner: repo.owner,
                        repo: repo.repo,
                        enabled: checked === true,
                      })
                    }
                  />
                  <span className="text-sm">{repo.owner}/{repo.repo}</span>
                </label>
              );
            })}
            {(!trackedRepos || trackedRepos.length === 0) && (
              <p className="text-sm text-muted-foreground">No tracked repos. Add repos first.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const viewOptions: { value: ViewType; label: string; icon: typeof List }[] = [
  { value: "list", label: "List", icon: List },
  { value: "table", label: "Table", icon: LayoutList },
  { value: "kanban", label: "Kanban", icon: Columns3 },
];

const KANBAN_COLUMNS = [
  { id: "to do", label: "To Do" },
  { id: "doing", label: "Doing" },
  { id: "in review", label: "In Review" },
  { id: "done", label: "Done" },
];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "repo", label: "Repo" },
  { value: "effort", label: "Effort" },
  { value: "time", label: "Time" },
];

const DEFAULT_COLUMN_SORT: ColumnSort = { field: "priority", direction: "desc" };

function PreferredViewSettings() {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  const selectedView = prefs?.preferred_view ?? "list";
  const kanbanSort = prefs?.kanban_sort ?? {};

  function getColumnSort(columnId: string): ColumnSort {
    return kanbanSort[columnId] || DEFAULT_COLUMN_SORT;
  }

  function updateColumnSort(columnId: string, update: Partial<ColumnSort>) {
    const current = getColumnSort(columnId);
    const next = { ...kanbanSort, [columnId]: { ...current, ...update } };
    updatePrefs.mutate({ kanban_sort: next });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Default View</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose which view opens by default when navigating to Issues.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : (
          <>
            <ToggleGroup
              type="single"
              value={selectedView}
              onValueChange={(v) => {
                if (v) updatePrefs.mutate({ preferred_view: v as ViewType });
              }}
              className="justify-start"
            >
              {viewOptions.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  className="gap-2 px-4"
                >
                  <opt.icon className="size-4" />
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {selectedView === "kanban" && (
              <div className="space-y-3 pt-2">
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Default column ordering</Label>
                  <div className="mt-2 space-y-2">
                    {KANBAN_COLUMNS.map((col) => {
                      const sort = getColumnSort(col.id);
                      return (
                        <div key={col.id} className="flex items-center gap-3">
                          <span className="w-20 text-xs font-medium">{col.label}</span>
                          <ToggleGroup
                            type="single"
                            variant="outline"
                            size="sm"
                            value={sort.field}
                            onValueChange={(v) => {
                              if (v) updateColumnSort(col.id, { field: v as SortField });
                            }}
                          >
                            {SORT_OPTIONS.map((opt) => (
                              <ToggleGroupItem
                                key={opt.value}
                                value={opt.value}
                                className="h-7 px-2 text-xs"
                              >
                                {opt.label}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => updateColumnSort(col.id, {
                              direction: sort.direction === "desc" ? "asc" : "desc",
                            })}
                          >
                            {sort.direction === "desc" ? (
                              <ArrowDownNarrowWide className="size-3.5" />
                            ) : (
                              <ArrowUpNarrowWide className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

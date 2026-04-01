"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FilterConfig } from "@/types/github";

const DEFAULT_FILTERS: FilterConfig = {
  repos: [],
  assignees: [],
  labels: [],
  priority: [],
  effort: [],
  status: [],
  state: "open",
  milestone: [],
  search: "",
};

function parseArray(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function useFilterState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: FilterConfig = useMemo(
    () => ({
      repos: parseArray(searchParams.get("repos")),
      assignees: parseArray(searchParams.get("assignees")),
      labels: parseArray(searchParams.get("labels")),
      priority: parseArray(searchParams.get("priority")),
      effort: parseArray(searchParams.get("effort")),
      status: parseArray(searchParams.get("status")),
      state: (searchParams.get("state") as FilterConfig["state"]) || "open",
      milestone: parseArray(searchParams.get("milestone")),
      search: searchParams.get("q") || "",
    }),
    [searchParams]
  );

  const setFilters = useCallback(
    (updates: Partial<FilterConfig>) => {
      const next = { ...filters, ...updates };
      const params = new URLSearchParams();

      // Preserve view param
      const currentView = searchParams.get("view");
      if (currentView) params.set("view", currentView);

      if (next.state !== "open") params.set("state", next.state);
      if (next.repos.length) params.set("repos", next.repos.join(","));
      if (next.status.length) params.set("status", next.status.join(","));
      if (next.priority.length) params.set("priority", next.priority.join(","));
      if (next.effort.length) params.set("effort", next.effort.join(","));
      if (next.assignees.length) params.set("assignees", next.assignees.join(","));
      if (next.labels.length) params.set("labels", next.labels.join(","));
      if (next.milestone.length) params.set("milestone", next.milestone.join(","));
      if (next.search) params.set("q", next.search);

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [filters, searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    const currentView = searchParams.get("view");
    const url = currentView ? `${pathname}?view=${currentView}` : pathname;
    router.replace(url, { scroll: false });
  }, [searchParams, router, pathname]);

  const hasActiveFilters = useMemo(
    () =>
      filters.repos.length > 0 ||
      filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.effort.length > 0 ||
      filters.assignees.length > 0 ||
      filters.labels.length > 0 ||
      filters.milestone.length > 0 ||
      filters.search !== "" ||
      filters.state !== "open",
    [filters]
  );

  const view = (searchParams.get("view") as "table" | "kanban") || "table";

  const setView = useCallback(
    (v: "table" | "kanban") => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === "table") {
        params.delete("view");
      } else {
        params.set("view", v);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return { filters, setFilters, clearFilters, hasActiveFilters, view, setView, DEFAULT_FILTERS };
}

"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { FilterConfig } from "@/types/github";
import type { ViewType } from "@/components/filters/view-switcher";

const FILTER_PARAMS = ["repos", "status", "priority", "effort", "ai", "hasPr", "assignees", "labels", "milestone", "q", "state", "_cleared"];

function hasAnyFilterParams(sp: URLSearchParams): boolean {
  return FILTER_PARAMS.some((p) => sp.has(p));
}

const DEFAULT_FILTERS: FilterConfig = {
  repos: [],
  assignees: [],
  labels: [],
  priority: [],
  effort: [],
  status: [],
  ai: [],
  hasPr: false,
  state: "open",
  milestone: [],
  search: "",
};

function parseArray(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function useFilterState(defaultView: ViewType = "list", defaultFilters?: Partial<FilterConfig> | null) {
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
      ai: parseArray(searchParams.get("ai")),
      hasPr: searchParams.get("hasPr") === "1",
      state: (searchParams.get("state") as FilterConfig["state"]) || "open",
      milestone: parseArray(searchParams.get("milestone")),
      search: searchParams.get("q") || "",
    }),
    [searchParams]
  );

  const weekOffset = useMemo(() => {
    const raw = searchParams.get("weekOffset");
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : Math.min(parsed, 0);
  }, [searchParams]);

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
      if (next.ai.length) params.set("ai", next.ai.join(","));
      if (next.hasPr) params.set("hasPr", "1");
      if (next.assignees.length) params.set("assignees", next.assignees.join(","));
      if (next.labels.length) params.set("labels", next.labels.join(","));
      if (next.milestone.length) params.set("milestone", next.milestone.join(","));
      if (next.search) params.set("q", next.search);

      // Preserve weekOffset when staying on closed, reset when switching away
      if (next.state === "closed" && weekOffset !== 0) {
        params.set("weekOffset", String(weekOffset));
      }

      // Preserve _cleared sentinel so defaults don't re-apply
      if (searchParams.has("_cleared")) params.set("_cleared", "1");

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [filters, searchParams, router, pathname, weekOffset]
  );

  const setWeekOffset = useCallback(
    (offset: number) => {
      const params = new URLSearchParams(searchParams.toString());
      const clamped = Math.min(offset, 0);
      if (clamped === 0) {
        params.delete("weekOffset");
      } else {
        params.set("weekOffset", String(clamped));
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    const currentView = searchParams.get("view");
    if (currentView) params.set("view", currentView);
    params.set("_cleared", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const hasActiveFilters = useMemo(
    () =>
      filters.repos.length > 0 ||
      filters.status.length > 0 ||
      filters.priority.length > 0 ||
      filters.effort.length > 0 ||
      filters.ai.length > 0 ||
      filters.hasPr ||
      filters.assignees.length > 0 ||
      filters.labels.length > 0 ||
      filters.milestone.length > 0 ||
      filters.search !== "" ||
      filters.state !== "open",
    [filters]
  );

  // Apply saved default filters on fresh navigation (no filter params in URL)
  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    if (!defaultFilters) return;
    if (hasAnyFilterParams(searchParams)) return;
    // Check if defaults have at least one meaningful value
    const hasValues = Object.entries(defaultFilters).some(([, v]) => {
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return v !== "" && v !== "open";
      return false;
    });
    if (!hasValues) return;
    defaultsAppliedRef.current = true;
    setFilters(defaultFilters);
  }, [defaultFilters, searchParams, setFilters]);

  const view = (searchParams.get("view") as ViewType) || defaultView;

  const setView = useCallback(
    (v: ViewType) => {
      const params = new URLSearchParams(searchParams.toString());
      if (v === defaultView) {
        params.delete("view");
      } else {
        params.set("view", v);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname, defaultView]
  );

  return { filters, setFilters, clearFilters, hasActiveFilters, view, setView, weekOffset, setWeekOffset, DEFAULT_FILTERS };
}

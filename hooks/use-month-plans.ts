"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { monthOf, type MonthPlan, type PlanMonth } from "@/lib/month-plan";
import { workInMonth } from "@/lib/project-plan";
import type { FeatureProject } from "@/lib/github/projects";
import type { FilterConfig } from "@/types/github";
import { useIssues } from "@/hooks/use-issues";
import { DEFAULT_FILTERS } from "@/hooks/use-filter-state";

const PLANS_KEY = ["month-plans"];

export interface PlansData {
  plans: MonthPlan[];
  months: PlanMonth[];
}

export interface PlansChange {
  plans?: MonthPlan[];
  months?: PlanMonth[];
}

export function useMonthPlans() {
  return useQuery<PlansData>({
    queryKey: PLANS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function upsert(data: PlansData | undefined, change: PlansChange): PlansData {
  const plans = (data?.plans ?? []).filter(
    (p) => !change.plans?.some((c) => c.person === p.person && c.month === p.month)
  );
  const months = (data?.months ?? []).filter((m) => !change.months?.some((c) => c.month === m.month));
  return {
    plans: [...plans, ...(change.plans ?? [])].sort((a, b) => a.month.localeCompare(b.month)),
    months: [...months, ...(change.months ?? [])].sort((a, b) => a.month.localeCompare(b.month)),
  };
}

/**
 * Saves plans and months together. Optimistic, because the page saves as you
 * type: the forecast reads the cache, so the bars move at once and only roll
 * back if the save fails.
 */
export function useSavePlans() {
  const queryClient = useQueryClient();
  return useMutation<Required<PlansChange>, Error, PlansChange, { previous?: PlansData }>({
    mutationFn: async (change) => {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans: change.plans ?? [], months: change.months ?? [] }),
      });
      if (!res.ok) throw new Error("Failed to save the plan");
      return res.json();
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: PLANS_KEY });
      const previous = queryClient.getQueryData<PlansData>(PLANS_KEY);
      queryClient.setQueryData<PlansData>(PLANS_KEY, upsert(previous, change));
      return { previous };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<PlansData>(PLANS_KEY, upsert(queryClient.getQueryData<PlansData>(PLANS_KEY), saved));
    },
    onError: (_error, _change, context) => {
      if (context?.previous) queryClient.setQueryData(PLANS_KEY, context.previous);
      toast.error("The plan wasn't saved");
    },
  });
}

export function useDeleteMonthPlan() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { person: string; month: string }>({
    mutationFn: async ({ person, month }) => {
      const params = new URLSearchParams({ person, month });
      const res = await fetch(`/api/plans?${params}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete the plan");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLANS_KEY }),
    onError: () => toast.error("The plan wasn't deleted"),
  });
}

export function useImportMonthPlans() {
  const queryClient = useQueryClient();
  return useMutation<{ plans: number; months: number }, Error, unknown>({
    mutationFn: async (file) => {
      const res = await fetch("/api/plans/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(file),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed");
      return body;
    },
    onSuccess: ({ plans, months }) => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      toast.success(`Imported ${plans} plan${plans === 1 ? "" : "s"} over ${months} month${months === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useFeatureProjects() {
  return useQuery<{ projects: FeatureProject[]; errors: { owner: string; error: string }[] }>({
    queryKey: ["feature-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch Projects");
      return res.json();
    },
    staleTime: 60_000,
  });
}

const OPEN: FilterConfig = { ...DEFAULT_FILTERS, state: "open" };
const CLOSED: FilterConfig = { ...DEFAULT_FILTERS, state: "closed" };

export interface MonthWork {
  /** The current month, `YYYY-MM`. */
  month: string;
  /** Someone has a plan for it, so the filter has something to show. */
  planned: boolean;
  /** Issue keys in someone's plan for the month; null while loading or off. */
  keys: Set<string> | null;
  isLoading: boolean;
  /** The plans or the issues they need didn't load: the filter can't apply. */
  failed: boolean;
}

/**
 * What the board's "this month" filter keeps: workInMonth over the same data
 * the Plan page reads (the same queries, so the cache is shared). Closed
 * issues back to the month's start are needed because agreed work that is
 * done is still the month's. Loads nothing while the filter is off.
 */
export function useMonthWork(enabled: boolean): MonthWork {
  const month = monthOf(new Date());
  const plansQuery = useMonthPlans();
  const closedSince = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [month]);
  const openQuery = useIssues(OPEN, 0, { enabled });
  const closedQuery = useIssues(CLOSED, 0, { closedSince, enabled });

  const plans = plansQuery.data?.plans;
  const months = plansQuery.data?.months;
  const failed = enabled && (plansQuery.isError || openQuery.isError || closedQuery.isError);
  const ready = enabled && !!plans && !!months && !!openQuery.data && !!closedQuery.data;
  const open = openQuery.allIssues;
  const closed = closedQuery.allIssues;

  const keys = useMemo(
    () => (ready && plans && months ? workInMonth({ plans, months, currentMonth: month, open, closed }, month) : null),
    [ready, plans, months, month, open, closed]
  );

  return {
    month,
    planned: !!plans?.some((p) => p.month === month),
    keys,
    isLoading: enabled && !failed && keys === null,
    failed,
  };
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MonthPlan, PlanMonth } from "@/lib/month-plan";
import type { FeatureProject } from "@/lib/github/projects";

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

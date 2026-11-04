"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { MonthPlan } from "@/lib/month-plan";
import type { FeatureProject } from "@/lib/github/projects";

const PLANS_KEY = ["month-plans"];

export function useMonthPlans() {
  return useQuery<{ plans: MonthPlan[] }>({
    queryKey: PLANS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function upsert(plans: MonthPlan[], plan: MonthPlan): MonthPlan[] {
  const rest = plans.filter((p) => !(p.person === plan.person && p.month === plan.month));
  return [...rest, plan].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Optimistic, because the page saves as you type: the forecast reads the
 * cache, so the bars move at once and only roll back if the save fails.
 */
export function useSaveMonthPlan() {
  const queryClient = useQueryClient();
  return useMutation<{ plan: MonthPlan }, Error, MonthPlan, { previous?: { plans: MonthPlan[] } }>({
    mutationFn: async (plan) => {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error("Failed to save the plan");
      return res.json();
    },
    onMutate: async (plan) => {
      await queryClient.cancelQueries({ queryKey: PLANS_KEY });
      const previous = queryClient.getQueryData<{ plans: MonthPlan[] }>(PLANS_KEY);
      queryClient.setQueryData<{ plans: MonthPlan[] }>(PLANS_KEY, {
        plans: upsert(previous?.plans ?? [], plan),
      });
      return { previous };
    },
    onSuccess: ({ plan }) => {
      const current = queryClient.getQueryData<{ plans: MonthPlan[] }>(PLANS_KEY);
      queryClient.setQueryData<{ plans: MonthPlan[] }>(PLANS_KEY, {
        plans: upsert(current?.plans ?? [], plan),
      });
    },
    onError: (_error, _plan, context) => {
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
  return useMutation<{ person: string; imported: number }, Error, unknown>({
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
    onSuccess: ({ person, imported }) => {
      queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      toast.success(`Imported ${imported} plan${imported === 1 ? "" : "s"} for ${person}`);
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

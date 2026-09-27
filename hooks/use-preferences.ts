"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ViewType } from "@/components/filters/view-switcher";
import type { KanbanSortPrefs, TableColumnPrefs } from "@/lib/db/user-preferences";
import type { FilterConfig } from "@/types/github";

export interface UserPreferences {
  preferred_view: ViewType;
  kanban_sort: KanbanSortPrefs | null;
  dashboard_metrics: string[] | null;
  metrics_collapsed: boolean;
  default_filters: Partial<FilterConfig> | null;
  table_columns: TableColumnPrefs | null;
}

export function usePreferences() {
  return useQuery<UserPreferences>({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await fetch("/api/settings/preferences");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  // Optimistic: the cache is what every view reads (the kanban's column sorts
  // included), so it takes the change at once and rolls back if the save fails.
  return useMutation<UserPreferences, Error, Partial<UserPreferences>, { previous?: UserPreferences }>({
    mutationFn: async (prefs) => {
      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: ["preferences"] });
      const previous = queryClient.getQueryData<UserPreferences>(["preferences"]);
      if (previous) {
        queryClient.setQueryData<UserPreferences>(["preferences"], { ...previous, ...prefs });
      }
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
      toast.success("Preferences saved");
    },
    onError: (_error, _prefs, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["preferences"], context.previous);
      }
      toast.error("Failed to save preferences");
    },
  });
}

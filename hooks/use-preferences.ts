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

  return useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      const res = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
      toast.success("Preferences saved");
    },
    onError: () => {
      toast.error("Failed to save preferences");
    },
  });
}

import { db } from "./index";
import type { SortField, SortDirection } from "@/components/kanban/kanban-board";
import type { FilterConfig } from "@/types/github";

export interface KanbanColumnSort {
  field: SortField;
  direction: SortDirection;
}

export interface KanbanSortPrefs {
  [columnId: string]: KanbanColumnSort;
}

export interface UserPreferences {
  preferred_view: "list" | "table" | "kanban";
  kanban_sort: KanbanSortPrefs | null;
  dashboard_metrics: string[] | null;
  metrics_collapsed: boolean;
  default_filters: Partial<FilterConfig> | null;
}

const DEFAULTS: UserPreferences = {
  preferred_view: "list",
  kanban_sort: null,
  dashboard_metrics: null,
  metrics_collapsed: false,
  default_filters: null,
};

export function getUserPreferences(
  workspaceId: string,
  githubUsername: string
): UserPreferences {
  const row = db
    .prepare(
      "SELECT preferred_view, kanban_sort, dashboard_metrics, metrics_collapsed, default_filters FROM user_preferences WHERE workspace_id = ? AND github_username = ?"
    )
    .get(workspaceId, githubUsername) as {
      preferred_view: string;
      kanban_sort: string | null;
      dashboard_metrics: string | null;
      metrics_collapsed: number;
      default_filters: string | null;
    } | undefined;

  if (!row) return DEFAULTS;

  return {
    preferred_view: row.preferred_view as UserPreferences["preferred_view"],
    kanban_sort: row.kanban_sort ? JSON.parse(row.kanban_sort) : null,
    dashboard_metrics: row.dashboard_metrics ? JSON.parse(row.dashboard_metrics) : null,
    metrics_collapsed: row.metrics_collapsed === 1,
    default_filters: row.default_filters ? JSON.parse(row.default_filters) : null,
  };
}

export function setUserPreferences(
  workspaceId: string,
  githubUsername: string,
  prefs: Partial<UserPreferences>
): void {
  const current = getUserPreferences(workspaceId, githubUsername);
  const merged = { ...current, ...prefs };
  const kanbanSortJson = merged.kanban_sort ? JSON.stringify(merged.kanban_sort) : null;
  const dashboardMetricsJson = merged.dashboard_metrics ? JSON.stringify(merged.dashboard_metrics) : null;
  const metricsCollapsedInt = merged.metrics_collapsed ? 1 : 0;
  const defaultFiltersJson = merged.default_filters ? JSON.stringify(merged.default_filters) : null;

  db.prepare(
    `INSERT INTO user_preferences (workspace_id, github_username, preferred_view, kanban_sort, dashboard_metrics, metrics_collapsed, default_filters)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, github_username)
     DO UPDATE SET preferred_view = excluded.preferred_view, kanban_sort = excluded.kanban_sort, dashboard_metrics = excluded.dashboard_metrics, metrics_collapsed = excluded.metrics_collapsed, default_filters = excluded.default_filters`
  ).run(workspaceId, githubUsername, merged.preferred_view, kanbanSortJson, dashboardMetricsJson, metricsCollapsedInt, defaultFiltersJson);
}

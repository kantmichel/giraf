import { db } from "./index";
import type { SortField, SortDirection } from "@/components/kanban/kanban-board";

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
}

const DEFAULTS: UserPreferences = {
  preferred_view: "list",
  kanban_sort: null,
  dashboard_metrics: null,
  metrics_collapsed: false,
};

export function getUserPreferences(
  workspaceId: string,
  githubUsername: string
): UserPreferences {
  const row = db
    .prepare(
      "SELECT preferred_view, kanban_sort, dashboard_metrics, metrics_collapsed FROM user_preferences WHERE workspace_id = ? AND github_username = ?"
    )
    .get(workspaceId, githubUsername) as {
      preferred_view: string;
      kanban_sort: string | null;
      dashboard_metrics: string | null;
      metrics_collapsed: number;
    } | undefined;

  if (!row) return DEFAULTS;

  return {
    preferred_view: row.preferred_view as UserPreferences["preferred_view"],
    kanban_sort: row.kanban_sort ? JSON.parse(row.kanban_sort) : null,
    dashboard_metrics: row.dashboard_metrics ? JSON.parse(row.dashboard_metrics) : null,
    metrics_collapsed: row.metrics_collapsed === 1,
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

  db.prepare(
    `INSERT INTO user_preferences (workspace_id, github_username, preferred_view, kanban_sort, dashboard_metrics, metrics_collapsed)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, github_username)
     DO UPDATE SET preferred_view = excluded.preferred_view, kanban_sort = excluded.kanban_sort, dashboard_metrics = excluded.dashboard_metrics, metrics_collapsed = excluded.metrics_collapsed`
  ).run(workspaceId, githubUsername, merged.preferred_view, kanbanSortJson, dashboardMetricsJson, metricsCollapsedInt);
}

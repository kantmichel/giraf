import { STATUS_LABELS } from "@/lib/constants";

/**
 * What the kanban board is made of: its columns and how each can be sorted.
 * The board and the Settings page both read these. When each kept its own
 * copy they drifted — Settings had no Age option, and both defaulted to
 * priority while the rest of the app ranked by WSJF.
 */

export type SortField = "priority" | "repo" | "effort" | "wsjf" | "time" | "age";
export type SortDirection = "asc" | "desc";
export interface ColumnSort {
  field: SortField;
  direction: SortDirection;
}
/** Saved per-column sorts, keyed by column id. A missing column uses the default. */
export type KanbanSorts = Record<string, ColumnSort>;

/** The status columns in board order. */
export const KANBAN_COLUMNS = [
  { id: "to do", label: "To Do", color: STATUS_LABELS[0].color },
  { id: "doing", label: "Doing", color: STATUS_LABELS[1].color },
  { id: "in review", label: "In Review", color: STATUS_LABELS[2].color },
  { id: "done", label: "Done", color: STATUS_LABELS[3].color },
];

/** Issues without a known status. Not a status itself, so it sits apart. */
export const UNSET_COLUMN = { id: "unset", label: "Unset", color: "666666" };

/** Ranking is decided in lib/wsjf.ts, so every column leads with it, highest first. */
export const DEFAULT_COLUMN_SORT: ColumnSort = { field: "wsjf", direction: "desc" };

export function columnSort(sorts: KanbanSorts | null | undefined, columnId: string): ColumnSort {
  return sorts?.[columnId] ?? DEFAULT_COLUMN_SORT;
}

type TimeField = "createdAt" | "updatedAt" | "closedAt";

/** The date "Time" sorts by in each column: what the column's age means. */
export const TIME_FIELD: Record<string, TimeField> = {
  "to do": "createdAt",
  doing: "updatedAt",
  "in review": "updatedAt",
  done: "closedAt",
  unset: "createdAt",
};

const SORT_LABELS: Record<SortField, string> = {
  priority: "Priority",
  repo: "Repo",
  effort: "Effort",
  wsjf: "WSJF",
  time: "Time",
  age: "Age",
};

export const SORT_FIELDS = Object.keys(SORT_LABELS) as SortField[];

const TIME_LABELS: Record<TimeField, string> = {
  createdAt: "Created",
  updatedAt: "Updated",
  closedAt: "Closed",
};

/** "Time" is named for the date it actually sorts by in that column. */
export function sortLabel(field: SortField, columnId?: string): string {
  const timeField = columnId ? TIME_FIELD[columnId] : undefined;
  if (field === "time" && timeField) return TIME_LABELS[timeField];
  return SORT_LABELS[field];
}

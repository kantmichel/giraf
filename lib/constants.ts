export const STATUS_LABELS = [
  { name: "status: to do", color: "e6e6e6", description: "Backlog / not started" },
  { name: "status: doing", color: "fbca04", description: "In progress" },
  { name: "status: in review", color: "1d76db", description: "PR open, awaiting review" },
  { name: "status: done", color: "0e8a16", description: "Completed" },
] as const;

export const PRIORITY_LABELS = [
  { name: "priority: critical", color: "b60205", description: "Drop everything" },
  { name: "priority: high", color: "d93f0b", description: "Next up" },
  { name: "priority: medium", color: "fbca04", description: "Normal queue" },
  { name: "priority: low", color: "0e8a16", description: "Nice to have" },
] as const;

export const GIRA_LABELS = [...STATUS_LABELS, ...PRIORITY_LABELS];

export type StatusName = (typeof STATUS_LABELS)[number]["name"];
export type PriorityName = (typeof PRIORITY_LABELS)[number]["name"];

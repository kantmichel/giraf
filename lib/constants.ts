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

export const EFFORT_LABELS = [
  { name: "effort: low", color: "0e8a16", description: "Quick task" },
  { name: "effort: medium", color: "fbca04", description: "A few hours to a day" },
  { name: "effort: high", color: "d93f0b", description: "Multiple days" },
] as const;

export const AI_STATE_LABELS = [
  { value: "review-queued", label: "Review queued" },
  { value: "reviewing", label: "Reviewing" },
  { value: "review-done", label: "Reviewed" },
  { value: "review-failed", label: "Review failed" },
  { value: "work-queued", label: "Work queued" },
  { value: "working", label: "Working" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
] as const;

export const GIRA_LABELS = [...STATUS_LABELS, ...PRIORITY_LABELS, ...EFFORT_LABELS];

export type StatusName = (typeof STATUS_LABELS)[number]["name"];
export type PriorityName = (typeof PRIORITY_LABELS)[number]["name"];
export type EffortName = (typeof EFFORT_LABELS)[number]["name"];

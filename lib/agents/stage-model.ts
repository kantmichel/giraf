import type { AgentKind, AgentStageDef, StageStatus } from "@/types/agents";

export const CLAUDE_WORK_STAGES: AgentStageDef[] = [
  { code: "Q", label: "Queued" },
  { code: "W", label: "Working" },
  { code: "PR", label: "PR Opened" },
  { code: "HR", label: "Human Review" },
  { code: "M", label: "Merged" },
];

export const CLAUDE_REVIEW_STAGES: AgentStageDef[] = [
  { code: "Q", label: "Queued" },
  { code: "R", label: "Reviewing" },
  { code: "D", label: "Done" },
];

export function getHardcodedStages(kind: AgentKind): AgentStageDef[] | null {
  if (kind === "claude-work") return CLAUDE_WORK_STAGES;
  if (kind === "claude-review") return CLAUDE_REVIEW_STAGES;
  return null;
}

/**
 * Tailwind class map for the rounded-square stage BLOCK per status.
 * Each block is self-contained (no connecting rails) — inspired by the
 * tool-chip grid in the Apiiro/Ox reference dashboard.
 */
export const STAGE_BLOCK_CLASSES: Record<StageStatus, string> = {
  pending:
    "bg-muted/30 border border-border/80 text-muted-foreground/60",
  active:
    "bg-blue-500 text-white ring-2 ring-blue-300/60 dark:ring-blue-400/40 shadow-sm shadow-blue-500/20",
  complete:
    "bg-green-500 text-white dark:bg-green-500/90",
  paused:
    "bg-amber-500 text-white ring-2 ring-amber-300/60 dark:ring-amber-400/40",
  failed:
    "bg-red-500 text-white",
  skipped:
    "bg-muted/30 border border-dashed border-border text-muted-foreground/50",
};

/**
 * Per-kind background colour for the row's left-side kind icon card.
 */
export const KIND_ICON_BG: Record<AgentKind, string> = {
  "claude-work":
    "bg-amber-100/70 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "claude-review":
    "bg-blue-100/70 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "gh-action":
    "bg-violet-100/70 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

export const KIND_LABEL: Record<AgentKind, string> = {
  "claude-work": "Claude Work",
  "claude-review": "Claude Review",
  "gh-action": "GitHub Actions",
};

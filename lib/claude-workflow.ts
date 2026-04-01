export const CLAUDE_LABELS = [
  "claude-review-start",
  "claude-reviewing",
  "claude-review-done",
  "claude-review-failed",
  "claude-start",
  "claude-working",
  "claude-done",
  "claude-failed",
] as const;

export type ClaudeState =
  | "review-queued"
  | "reviewing"
  | "review-done"
  | "review-failed"
  | "work-queued"
  | "working"
  | "done"
  | "failed";

const LABEL_TO_STATE: Record<string, ClaudeState> = {
  "claude-review-start": "review-queued",
  "claude-reviewing": "reviewing",
  "claude-review-done": "review-done",
  "claude-review-failed": "review-failed",
  "claude-start": "work-queued",
  "claude-working": "working",
  "claude-done": "done",
  "claude-failed": "failed",
};

export function extractClaudeState(
  labels: { name: string }[]
): ClaudeState | null {
  for (const label of labels) {
    const state = LABEL_TO_STATE[label.name];
    if (state) return state;
  }

  return null;
}

export function isClaudeLabel(name: string): boolean {
  return (CLAUDE_LABELS as readonly string[]).includes(name);
}

export function getClaudeLabelForAction(
  action: "start-review" | "start-work"
): string {
  return action === "start-review" ? "claude-review-start" : "claude-start";
}

export function getLabelsToRemoveForAction(
  action: "start-review" | "start-work"
): string[] {
  // When starting work, remove the review-done label
  return action === "start-work" ? ["claude-review-done"] : [];
}

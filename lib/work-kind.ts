import type { FeatureRef, NormalizedIssue } from "@/types/github";

/**
 * The one place that decides whether an issue is feature work or maintenance.
 *
 * GitHub's native issue type carries it: "Feature" is feature work, and every
 * other type — Bug, Patch, Refactor, Task, or none at all — is maintenance.
 * Untyped counts as maintenance on purpose: feature work is what gets planned
 * into a month, so a ticket only becomes feature work when someone says so.
 */
export const FEATURE_ISSUE_TYPE = "Feature";

export type WorkKind = "feature" | "maintenance";

export const WORK_KIND_OPTIONS: { value: WorkKind; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "maintenance", label: "Maintenance" },
];

export function workKind(issue: Pick<NormalizedIssue, "issueType">): WorkKind {
  return issue.issueType === FEATURE_ISSUE_TYPE ? "feature" : "maintenance";
}

/** Stable id for a feature Project, used in filter URLs. */
export function featureKey(feature: Pick<FeatureRef, "owner" | "number">): string {
  return `${feature.owner}/${feature.number}`;
}

import type { FeatureRef, NormalizedIssue } from "@/types/github";

/**
 * The one place that decides which kind of work an issue is, and so which lane
 * of a month plan it lands in.
 *
 * GitHub's native issue type carries it: "Feature" is feature work, "Ad hoc"
 * is unplanned work a customer or support asks for during the month, and
 * every other type — Bug, Patch, Refactor, Task, or none at all — is
 * maintenance. Untyped counts as maintenance on purpose: feature and ad hoc
 * work each get their own hours, so a ticket only moves out of maintenance
 * when someone says so. A type, unlike a label, holds one value, so a ticket
 * can never be in two lanes.
 *
 * "Epic" is no work at all: it is a Project's context and decisions, the
 * issue to read for what the Project is about. It goes in no lane and counts
 * no hours, whatever its effort label says; its status follows the Project's
 * tickets (see summarizeProject).
 */
export const FEATURE_ISSUE_TYPE = "Feature";
export const AD_HOC_ISSUE_TYPE = "Ad hoc";
export const EPIC_ISSUE_TYPE = "Epic";

export type WorkKind = "feature" | "maintenance" | "adhoc" | "epic";

export const WORK_KIND_OPTIONS: { value: WorkKind; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "maintenance", label: "Maintenance" },
  { value: "adhoc", label: "Ad hoc" },
  { value: "epic", label: "Epic" },
];

export function workKind(issue: Pick<NormalizedIssue, "issueType">): WorkKind {
  if (issue.issueType === FEATURE_ISSUE_TYPE) return "feature";
  if (issue.issueType === AD_HOC_ISSUE_TYPE) return "adhoc";
  if (issue.issueType === EPIC_ISSUE_TYPE) return "epic";
  return "maintenance";
}

/** Stable id for a feature Project, used in filter URLs. */
export function featureKey(feature: Pick<FeatureRef, "owner" | "number">): string {
  return `${feature.owner}/${feature.number}`;
}

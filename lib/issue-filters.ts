import { UNSET_FILTER_VALUE } from "@/lib/constants";
import { AGE_BUCKETS, matchesAgeBuckets } from "@/lib/issue-age";
import { issueKey } from "@/lib/month-plan";
import { workKind, featureKey } from "@/lib/work-kind";
import type { FilterConfig, NormalizedIssue } from "@/types/github";

/**
 * The one place that decides which issues a FilterConfig keeps. The list
 * uses it to filter and the filter bar to count its options, so a dropdown
 * can only offer what the list would then show.
 */

/** The filters that are a dropdown (or the people toggles) in the filter bar. */
export type FacetKey = "repos" | "type" | "feature" | "status" | "priority" | "effort" | "age" | "ai" | "version" | "assignees";

export const FACET_KEYS: readonly FacetKey[] = ["repos", "type", "feature", "status", "priority", "effort", "age", "ai", "version", "assignees"];

/** Per dropdown, how many issues each of its values has under all the other filters. */
export type FacetCounts = Record<FacetKey, Map<string, number>>;

export interface FilterContext {
  /** On the closed view of /issues, only issues closed in this week. */
  closedWeek: { start: Date; end: Date } | null;
  /** The issue keys in this month's plans; null while unknown (not narrowed). */
  monthWork: Set<string> | null;
}

interface Test {
  /** The dropdown this filter is, or null for one that isn't (PR, search…). */
  facet: FacetKey | null;
  keep: (issue: NormalizedIssue) => boolean;
}

/** A label-like filter: the selected values, and "not set" for a missing one. */
function oneOf(selected: string[], value: (i: NormalizedIssue) => string | null): (i: NormalizedIssue) => boolean {
  const includeUnset = selected.includes(UNSET_FILTER_VALUE);
  return (i) => {
    const v = value(i);
    return v ? selected.includes(v) : includeUnset;
  };
}

function tests(filters: FilterConfig, ctx: FilterContext): Test[] {
  const out: Test[] = [];
  const now = new Date();
  const week = ctx.closedWeek;
  if (week) {
    out.push({
      facet: null,
      keep: (i) => {
        if (!i.closedAt) return false;
        const closed = new Date(i.closedAt);
        return closed >= week.start && closed <= week.end;
      },
    });
  }
  if (filters.repos.length) out.push({ facet: "repos", keep: (i) => filters.repos.includes(i.repo.fullName) });
  if (filters.status.length) out.push({ facet: "status", keep: oneOf(filters.status, (i) => i.status) });
  if (filters.priority.length) out.push({ facet: "priority", keep: oneOf(filters.priority, (i) => i.priority) });
  if (filters.effort.length) out.push({ facet: "effort", keep: oneOf(filters.effort, (i) => i.effort) });
  if (filters.age.length) out.push({ facet: "age", keep: (i) => matchesAgeBuckets(i.createdAt, filters.age, now) });
  if (filters.assignees.length) {
    // Someone asked to review a linked PR is on the hook for the issue just
    // as much as its assignee, so this filter matches either role.
    out.push({ facet: "assignees", keep: (i) => people(i).some((p) => filters.assignees.includes(p)) });
  }
  if (filters.ai.length) out.push({ facet: "ai", keep: oneOf(filters.ai, (i) => i.claudeState) });
  if (filters.version.length) out.push({ facet: "version", keep: oneOf(filters.version, (i) => i.version) });
  if (filters.hasPr) out.push({ facet: null, keep: (i) => i.linkedPrs.length > 0 });
  if (filters.labels.length) out.push({ facet: null, keep: (i) => i.labels.some((l) => filters.labels.includes(l.name)) });
  if (filters.type.length) out.push({ facet: "type", keep: (i) => filters.type.includes(workKind(i)) });
  if (filters.feature.length) {
    const includeUnset = filters.feature.includes(UNSET_FILTER_VALUE);
    out.push({
      facet: "feature",
      keep: (i) => (includeUnset && i.features.length === 0) || i.features.some((f) => filters.feature.includes(featureKey(f))),
    });
  }
  const monthWork = ctx.monthWork;
  if (filters.thisMonth && monthWork) out.push({ facet: null, keep: (i) => monthWork.has(issueKey(i)) });
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out.push({ facet: null, keep: (i) => i.title.toLowerCase().includes(q) });
  }
  return out;
}

const people = (i: NormalizedIssue) => [
  ...i.assignees.map((a) => a.login),
  ...i.linkedPrs.flatMap((pr) => pr.reviewers.map((r) => r.login)),
];

/** The values an issue has for a dropdown, as that dropdown's filter reads them. */
function valuesOf(facet: FacetKey, i: NormalizedIssue, now: Date): string[] {
  switch (facet) {
    case "repos":
      return [i.repo.fullName];
    case "type":
      return [workKind(i)];
    case "feature":
      return i.features.length ? i.features.map(featureKey) : [UNSET_FILTER_VALUE];
    case "status":
      return [i.status ?? UNSET_FILTER_VALUE];
    case "priority":
      return [i.priority ?? UNSET_FILTER_VALUE];
    case "effort":
      return [i.effort ?? UNSET_FILTER_VALUE];
    case "age":
      return AGE_BUCKETS.filter((b) => matchesAgeBuckets(i.createdAt, [b.value], now)).map((b) => b.value);
    case "ai":
      return [i.claudeState ?? UNSET_FILTER_VALUE];
    case "version":
      return [i.version || UNSET_FILTER_VALUE];
    case "assignees":
      return Array.from(new Set(people(i)));
  }
}

export function filterIssues<T extends NormalizedIssue>(issues: T[], filters: FilterConfig, ctx: FilterContext): T[] {
  const all = tests(filters, ctx);
  return issues.filter((i) => all.every((t) => t.keep(i)));
}

/**
 * For every dropdown, the issues that pass all the other filters, counted by
 * value: what the list would show if that value were picked. A dropdown's own
 * filter is left out, so picking Douwe still shows Michel's count, while the
 * Feature dropdown only counts Douwe's tickets. One pass: an issue that fails
 * no filter counts everywhere, one that fails exactly one counts in that
 * filter's dropdown only, and one that fails two counts nowhere.
 */
export function facetCounts(issues: NormalizedIssue[], filters: FilterConfig, ctx: FilterContext): FacetCounts {
  const all = tests(filters, ctx);
  const now = new Date();
  const counts = Object.fromEntries(FACET_KEYS.map((k) => [k, new Map<string, number>()])) as FacetCounts;
  const add = (facet: FacetKey, i: NormalizedIssue) => {
    const map = counts[facet];
    for (const v of valuesOf(facet, i, now)) map.set(v, (map.get(v) ?? 0) + 1);
  };
  for (const i of issues) {
    let failed: Test | null = null;
    let failures = 0;
    for (const t of all) {
      if (!t.keep(i)) {
        failed = t;
        if (++failures > 1) break;
      }
    }
    if (failures === 0) for (const k of FACET_KEYS) add(k, i);
    else if (failures === 1 && failed?.facet) add(failed.facet, i);
  }
  return counts;
}

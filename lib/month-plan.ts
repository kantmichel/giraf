import { workKind, featureKey } from "@/lib/work-kind";
import type { ScoredIssue } from "@/lib/wsjf";
import type { FeatureRef } from "@/types/github";

/**
 * A month plan: what one person's month holds, agreed at the start of it.
 *
 * The plan only holds the inputs — hours, split, hours per effort. Which
 * features the month works on belongs to the month, not the person (see
 * PlanMonth). Which tickets fit is never stored: it is worked out from GitHub
 * on every load, so two Gira instances with the same plan show the same
 * month. Plans travel between instances as an exported file (see PlanExport).
 */
export interface MonthPlan {
  /** GitHub login of the person whose month this is. */
  person: string;
  /** Calendar month, `YYYY-MM`. */
  month: string;
  regularHours: number;
  investmentHours: number;
  /** Percentages of the month's hours. Expected to add up to 100. */
  split: { feature: number; maintenance: number; adhoc: number };
  /** Estimated hours per `effort:` label. Kept per month, so changing the
   *  estimate later does not rewrite how an earlier month was planned. */
  effortHours: { low: number; medium: number; high: number };
  /** The tickets agreed for the month, saved when the plan was agreed. Until
   *  then the month is a live forecast of open work. Once agreed, progress is
   *  measured against this list only: a ticket closed in the month says
   *  nothing about who did the work or when, but an agreed ticket going to
   *  done is progress on what was agreed. */
  agreed: Agreement | null;
  /** When the plan last changed. Shown on the page so two instances can tell
   *  whether they hold the same version. */
  updatedAt: string;
}

/**
 * What a month holds for everyone: its features, in order, and its focus.
 *
 * Shared rather than per person, because a feature Project holds work for
 * several people: planning it into a month fills each person's feature lane
 * with the tickets assigned to them, from one list nobody has to keep in step.
 */
export interface PlanMonth {
  month: string;
  /** Feature Projects (`owner/number`) worked on this month, first first. */
  features: string[];
  focus: string;
  updatedAt: string;
}

export type LaneKind = "feature" | "maintenance" | "adhoc";

const LANE_KINDS: readonly LaneKind[] = ["feature", "maintenance", "adhoc"];

export interface Agreement {
  at: string;
  /** In the order they were agreed, which is the order they get worked.
   *  Ad hoc tickets are recorded too, as what was known when agreeing, but
   *  that lane never waits for an agreement (see adhocLane). */
  tickets: { key: string; lane: LaneKind }[];
  /** The plan's inputs when it was agreed, to tell when they changed since. */
  inputs: string;
}

/** What an agreement depends on: the person's numbers and the month's
 *  features. Focus is left out: rewording it changes no ticket. */
export function planInputs(plan: MonthPlan, features: string[]): string {
  return JSON.stringify([plan.regularHours, plan.investmentHours, plan.split, plan.effortHours, features]);
}

export const DEFAULT_SPLIT: MonthPlan["split"] = { feature: 60, maintenance: 30, adhoc: 10 };
export const DEFAULT_EFFORT_HOURS: MonthPlan["effortHours"] = { low: 1, medium: 2, high: 4 };

// ---------------------------------------------------------------------------
// Months as `YYYY-MM` strings. Plain arithmetic, so no timezone can shift them.

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_RE.test(value);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** The month a timestamp falls in, in the viewer's zone. */
export function monthOf(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 37.333 → "37.3 h". One decimal: the estimates are not finer than that. */
export function formatHours(hours: number): string {
  return `${Math.round(hours * 10) / 10} h`;
}

// ---------------------------------------------------------------------------
// Reading plans from the database or an imported file.

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * The one way a plan is read back, from a database row or an imported file.
 * Fills what is missing from the defaults, so a plan saved before a field
 * existed still loads. Returns null when person or month is unusable.
 * Features and focus in an older plan are ignored here: migration 17 moved
 * them to the month.
 */
export function parseMonthPlan(raw: unknown): MonthPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.person !== "string" || !r.person || !isMonth(r.month)) return null;
  const split = (r.split ?? {}) as Record<string, unknown>;
  const effort = (r.effortHours ?? {}) as Record<string, unknown>;
  return {
    person: r.person,
    month: r.month,
    regularHours: num(r.regularHours, 0),
    investmentHours: num(r.investmentHours, 0),
    split: {
      feature: num(split.feature, DEFAULT_SPLIT.feature),
      maintenance: num(split.maintenance, DEFAULT_SPLIT.maintenance),
      adhoc: num(split.adhoc, DEFAULT_SPLIT.adhoc),
    },
    effortHours: {
      low: num(effort.low, DEFAULT_EFFORT_HOURS.low),
      medium: num(effort.medium, DEFAULT_EFFORT_HOURS.medium),
      high: num(effort.high, DEFAULT_EFFORT_HOURS.high),
    },
    agreed: parseAgreement(r.agreed),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date(0).toISOString(),
  };
}

function parseAgreement(raw: unknown): Agreement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.at !== "string" || !Array.isArray(r.tickets)) return null;
  const tickets = r.tickets.filter(
    (t): t is Agreement["tickets"][number] =>
      !!t &&
      typeof (t as Record<string, unknown>).key === "string" &&
      LANE_KINDS.includes((t as Record<string, unknown>).lane as LaneKind)
  );
  return { at: r.at, tickets, inputs: typeof r.inputs === "string" ? r.inputs : "" };
}

/** The one way a month is read back, from a database row or an imported file. */
export function parsePlanMonth(raw: unknown): PlanMonth | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isMonth(r.month)) return null;
  return {
    month: r.month,
    features: Array.isArray(r.features)
      ? Array.from(new Set(r.features.filter((f): f is string => typeof f === "string")))
      : [],
    focus: typeof r.focus === "string" ? r.focus : "",
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date(0).toISOString(),
  };
}

/**
 * A new month starts from the one before it: the same hours, split and
 * estimates, since those rarely change month to month.
 */
export function newMonthPlan(person: string, month: string, previous: MonthPlan | null): MonthPlan {
  return {
    person,
    month,
    regularHours: previous?.regularHours ?? 0,
    investmentHours: previous?.investmentHours ?? 0,
    split: { ...(previous?.split ?? DEFAULT_SPLIT) },
    effortHours: { ...(previous?.effortHours ?? DEFAULT_EFFORT_HOURS) },
    agreed: null,
    updatedAt: new Date().toISOString(),
  };
}

export function newPlanMonth(month: string): PlanMonth {
  return { month, features: [], focus: "", updatedAt: new Date().toISOString() };
}

/**
 * A month's features with one added, in the place it belongs: a Project
 * carried on from an earlier month goes before the month's new work (after any
 * other carried-on one), so what was started gets finished before the next
 * thing starts. A new Project goes last. Every way of adding a feature to a
 * month uses this, so the order doesn't depend on where it was added from.
 */
export function withFeature(month: PlanMonth, key: string, months: PlanMonth[]): string[] {
  if (month.features.includes(key)) return month.features;
  const startedBefore = (k: string) => months.some((m) => m.month < month.month && m.features.includes(k));
  if (!startedBefore(key)) return [...month.features, key];
  const at = month.features.findIndex((k) => !startedBefore(k));
  return at === -1 ? [...month.features, key] : [...month.features.slice(0, at), key, ...month.features.slice(at)];
}

/** Everyone who has ever had a plan: the people a new month is planned for. */
export function teamOf(plans: MonthPlan[]): string[] {
  return Array.from(new Set(plans.map((p) => p.person))).sort((a, b) => a.localeCompare(b));
}

/**
 * What planning a month creates: the month itself, and a plan for each person
 * who has none in it yet, starting from their latest earlier month. Planning
 * a month plans it for everyone at once, so a feature with work for several
 * people fills all their months from one list. `extra` adds a person who has
 * no plan anywhere yet, such as the one whose month is on screen.
 */
export function planMonthFor(
  month: string,
  plans: MonthPlan[],
  months: PlanMonth[],
  extra: string[] = []
): { plans: MonthPlan[]; month: PlanMonth | null } {
  const created: MonthPlan[] = [];
  for (const person of Array.from(new Set([...teamOf(plans), ...extra.filter(Boolean)]))) {
    if (plans.some((p) => p.person === person && p.month === month)) continue;
    const previous =
      plans
        .filter((p) => p.person === person && p.month < month)
        .sort((a, b) => b.month.localeCompare(a.month))[0] ?? null;
    created.push(newMonthPlan(person, month, previous));
  }
  return { plans: created, month: months.some((m) => m.month === month) ? null : newPlanMonth(month) };
}

// ---------------------------------------------------------------------------
// Sharing between instances.

export const PLAN_EXPORT_KIND = "gira-month-plans";
export const PLAN_EXPORT_VERSION = 2;

/** The file sent between Gira instances: every person's plans and every
 *  month, since a month's features are shared. An import replaces all of it,
 *  so every month, and any total across months, matches on both sides. */
export interface PlanExport {
  kind: typeof PLAN_EXPORT_KIND;
  version: typeof PLAN_EXPORT_VERSION;
  exportedAt: string;
  plans: MonthPlan[];
  months: PlanMonth[];
}

/** Null when the file is not a plan export. A version 1 file (one person's
 *  plans, features inside each plan) comes from a Gira before shared months;
 *  it is refused rather than half-read, so ask for a new export. */
export function parsePlanExport(raw: unknown): PlanExport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== PLAN_EXPORT_KIND || r.version !== PLAN_EXPORT_VERSION) return null;
  if (!Array.isArray(r.plans) || !Array.isArray(r.months)) return null;
  return {
    kind: PLAN_EXPORT_KIND,
    version: PLAN_EXPORT_VERSION,
    exportedAt: typeof r.exportedAt === "string" ? r.exportedAt : "",
    plans: r.plans.map(parseMonthPlan).filter((p): p is MonthPlan => p !== null),
    months: r.months.map(parsePlanMonth).filter((m): m is PlanMonth => m !== null),
  };
}

// ---------------------------------------------------------------------------
// The forecast: which tickets fit in a month.

/** A person's plan with its month's features, as the forecast reads it. */
type Planned = MonthPlan & { features: string[] };

export interface PlanBudget {
  total: number;
  feature: number;
  maintenance: number;
  adhoc: number;
}

export function planBudget(plan: MonthPlan): PlanBudget {
  const total = plan.regularHours + plan.investmentHours;
  return {
    total,
    feature: (total * plan.split.feature) / 100,
    maintenance: (total * plan.split.maintenance) / 100,
    adhoc: (total * plan.split.adhoc) / 100,
  };
}

export type RowState = "done" | "in progress" | "to do";

export interface PlanRow {
  issue: ScoredIssue;
  /** Estimated hours, or null when the ticket has no effort label. */
  hours: number | null;
  state: RowState;
  /** Hours used up to and including this row. */
  cumulative: number;
  /** In the month: agreed, or inside the lane's hours in a live forecast. */
  fits: boolean;
  /** The planned feature this row belongs to, feature lane only. */
  feature: FeatureRef | null;
  /** Ad hoc lane only: counted, but not in the month's agreement, so it came
   *  in (or became ad hoc work) after the month was agreed. */
  afterAgreement: boolean;
}

export interface LaneForecast {
  budget: number;
  /** True when the rows that fit are the agreed list, not a live forecast. */
  agreed: boolean;
  rows: PlanRow[];
  doneHours: number;
  inProgressHours: number;
  /** Hours of not-started work in the month. */
  toDoHours: number;
  /** Live: hours of work below the line. Agreed: hours the agreed work runs
   *  over the lane, e.g. after an effort label went up. */
  overflowHours: number;
  /** Tickets without an effort label: listed, not counted. */
  unsized: number;
}

export interface MonthForecast {
  budget: PlanBudget;
  feature: LaneForecast;
  maintenance: LaneForecast;
  adhoc: LaneForecast;
  /** Open, sized tickets in this month's features that nobody is assigned to,
   *  so no one's month takes them. Tickets assigned to someone else are not
   *  counted: the month's features are shared, so those are in that person's
   *  month. Unsized ones are left out: a tracking issue has no effort on purpose. */
  unassigned: ScoredIssue[];
  /** The person's open tickets in this month's features that earlier months
   *  already take: why a planned feature can show nothing here. */
  earlier: number;
  /** Agreed tickets that are no longer among the loaded issues (moved, deleted). */
  missing: number;
  /** A month before the current one. */
  past: boolean;
}

export function issueKey(issue: Pick<ScoredIssue, "repo" | "number">): string {
  return `${issue.repo.fullName}#${issue.number}`;
}

const isEpic = (issue: ScoredIssue) => workKind(issue) === "epic";

function hoursFor(issue: ScoredIssue, plan: MonthPlan): number | null {
  return issue.effort ? plan.effortHours[issue.effort] : null;
}

function rowState(issue: ScoredIssue): RowState {
  if (issue.state === "closed" || issue.status === "done") return "done";
  return issue.status === "doing" || issue.status === "in review" ? "in progress" : "to do";
}

function plannedFeature(issue: ScoredIssue, plan: Planned): FeatureRef | null {
  let best: FeatureRef | null = null;
  let bestRank = Infinity;
  for (const f of issue.features) {
    const rank = plan.features.indexOf(featureKey(f));
    if (rank !== -1 && rank < bestRank) {
      best = f;
      bestRank = rank;
    }
  }
  return best;
}

interface Tally {
  rows: PlanRow[];
  cumulative: number;
  doneHours: number;
  inProgressHours: number;
  toDoHours: number;
  unsized: number;
}

const newTally = (): Tally => ({ rows: [], cumulative: 0, doneHours: 0, inProgressHours: 0, toDoHours: 0, unsized: 0 });

/** Add a row that is in the month: agreed, or above the line. */
function addIn(t: Tally, issue: ScoredIssue, plan: Planned, withFeature: boolean, afterAgreement = false): void {
  const hours = hoursFor(issue, plan);
  const state = rowState(issue);
  if (hours === null) t.unsized++;
  t.cumulative += hours ?? 0;
  if (state === "done") t.doneHours += hours ?? 0;
  else if (state === "in progress") t.inProgressHours += hours ?? 0;
  else t.toDoHours += hours ?? 0;
  t.rows.push({ issue, hours, state, cumulative: t.cumulative, fits: true, feature: withFeature ? plannedFeature(issue, plan) : null, afterAgreement });
}

/**
 * A live lane: work laid in order until the hours run out. The line is
 * strict — no smaller ticket skips ahead to fill a gap — because the order is
 * the agreement: features in their Project's order, maintenance by WSJF.
 * `keep` is work carried over from an earlier agreement that is already done,
 * so updating an agreement mid-month doesn't forget what got finished.
 */
function liveLane(budget: number, keep: ScoredIssue[], open: ScoredIssue[], plan: Planned, withFeature: boolean): LaneForecast {
  const t = newTally();
  for (const issue of keep) addIn(t, issue, plan, withFeature);
  const below: PlanRow[] = [];
  const unsizedRows: PlanRow[] = [];
  let overflowHours = 0;
  for (const issue of open) {
    const hours = hoursFor(issue, plan);
    const feature = withFeature ? plannedFeature(issue, plan) : null;
    if (hours === null) {
      t.unsized++;
      unsizedRows.push({ issue, hours, state: rowState(issue), cumulative: t.cumulative, fits: false, feature, afterAgreement: false });
      continue;
    }
    // A hundredth of an hour of slack, so 0.1 + 0.2 style sums fit exactly.
    if (below.length === 0 && t.cumulative + hours <= budget + 0.01) {
      addIn(t, issue, plan, withFeature);
    } else {
      overflowHours += hours;
      below.push({ issue, hours, state: rowState(issue), cumulative: t.cumulative + overflowHours, fits: false, feature, afterAgreement: false });
    }
  }
  return { budget, agreed: false, rows: [...t.rows, ...below, ...unsizedRows], doneHours: t.doneHours, inProgressHours: t.inProgressHours, toDoHours: t.toDoHours, overflowHours, unsized: t.unsized };
}

/** An agreed lane: the agreed tickets, then what else is waiting, for reference. */
function agreedLane(budget: number, agreed: ScoredIssue[], rest: ScoredIssue[], plan: Planned, withFeature: boolean): LaneForecast {
  const t = newTally();
  for (const issue of agreed) addIn(t, issue, plan, withFeature);
  let after = t.cumulative;
  const restRows: PlanRow[] = rest.map((issue) => {
    const hours = hoursFor(issue, plan);
    after += hours ?? 0;
    return { issue, hours, state: rowState(issue), cumulative: after, fits: false, feature: withFeature ? plannedFeature(issue, plan) : null, afterAgreement: false };
  });
  return {
    budget,
    agreed: true,
    rows: [...t.rows, ...restRows],
    doneHours: t.doneHours,
    inProgressHours: t.inProgressHours,
    toDoHours: t.toDoHours,
    overflowHours: Math.max(0, t.cumulative - budget),
    unsized: t.unsized,
  };
}

function byWsjf(a: ScoredIssue, b: ScoredIssue): number {
  const sa = a.wsjf.score;
  const sb = b.wsjf.score;
  if (sa === null || sb === null) return (sa === null ? 1 : 0) - (sb === null ? 1 : 0);
  return sb - sa || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

const inProgressFirst = (a: ScoredIssue, b: ScoredIssue) =>
  Number(rowState(b) === "in progress") - Number(rowState(a) === "in progress");

/** Open work for the person that each lane could take, in the lane's order. */
function candidates(plan: Planned, open: ScoredIssue[], taken: Set<string>) {
  const mine = (i: ScoredIssue) => i.assignees.some((a) => a.login === plan.person);
  const inPlannedFeature = (i: ScoredIssue) => plannedFeature(i, plan) !== null;
  // An open ticket already marked `status: done` is finished work waiting to
  // be closed, not something to pick up; an epic is no work at all.
  const openMine = open.filter((i) => mine(i) && i.status !== "done" && !isEpic(i) && !taken.has(issueKey(i)));

  // Feature lane: only the planned features. A Feature ticket in a Project
  // nobody planned this month waits for a month that plans it.
  const feature = openMine.filter(inPlannedFeature).sort((a, b) => {
    const fa = plannedFeature(a, plan)!;
    const fb = plannedFeature(b, plan)!;
    return (
      inProgressFirst(a, b) ||
      plan.features.indexOf(featureKey(fa)) - plan.features.indexOf(featureKey(fb)) ||
      fa.position - fb.position
    );
  });

  // Maintenance lane: everything that is neither feature nor ad hoc work, top
  // down by WSJF.
  const maintenance = openMine
    .filter((i) => !inPlannedFeature(i) && workKind(i) === "maintenance")
    .sort((a, b) => inProgressFirst(a, b) || byWsjf(a, b));

  const unassigned = open.filter(
    (i) => inPlannedFeature(i) && i.assignees.length === 0 && !!i.effort && !isEpic(i) && i.state === "open" && i.status !== "done"
  );
  return { feature, maintenance, unassigned };
}

const STATE_RANK: Record<RowState, number> = { done: 0, "in progress": 1, "to do": 2 };

/**
 * The ad hoc lane: unplanned work a customer or support asks for during the
 * month. Unlike the other lanes it has no line and doesn't wait for the
 * agreement, because the work arrives during the month and the reserve exists
 * to take it: what is agreed is the reserve, not the tickets. Tickets that
 * came in after the agreement still count, marked, so the month shows how
 * much pushed in; hours past the reserve are overflow. What the tickets leave
 * of the reserve is for support that never gets a ticket.
 *
 * A ticket counts in a month when it was agreed for it, closed in it, or —
 * in the current month only — is open now: open ad hoc work belongs to now,
 * so a later month's lane starts empty. Closing in the month is enough here,
 * unlike in maintenance, because the Ad hoc type and the assignee are set by
 * hand for work someone asked this person to do.
 */
function adhocLane(
  budget: number,
  plan: Planned,
  agreement: Agreement | null,
  agreed: ScoredIssue[],
  candidates: ScoredIssue[],
  includeOpen: boolean,
  byKey: Map<string, ScoredIssue>,
  taken: Set<string>
): LaneForecast {
  const mine = (i: ScoredIssue) => i.assignees.some((a) => a.login === plan.person);
  const counts = (i: ScoredIssue) => {
    if (workKind(i) !== "adhoc" || !mine(i) || plannedFeature(i, plan) !== null || taken.has(issueKey(i))) return false;
    if (i.state === "open") return includeOpen;
    return !!i.closedAt && monthOf(i.closedAt) === plan.month;
  };

  const issues = new Map<string, ScoredIssue>();
  for (const i of agreed) issues.set(issueKey(i), i);
  for (const i of candidates) {
    // The latest copy, so a ticket closed and reopened counts as it is now.
    const current = byKey.get(issueKey(i)) ?? i;
    if (!issues.has(issueKey(current)) && counts(current)) issues.set(issueKey(current), current);
  }

  const agreedKeys = new Set(agreed.map(issueKey));
  const sorted = Array.from(issues.values()).sort(
    (a, b) =>
      Number(!a.effort) - Number(!b.effort) ||
      STATE_RANK[rowState(a)] - STATE_RANK[rowState(b)] ||
      byWsjf(a, b)
  );

  const t = newTally();
  for (const issue of sorted) {
    taken.add(issueKey(issue));
    addIn(t, issue, plan, false, !!agreement && !agreedKeys.has(issueKey(issue)));
  }
  return {
    budget,
    agreed: !!agreement,
    rows: t.rows,
    doneHours: t.doneHours,
    inProgressHours: t.inProgressHours,
    toDoHours: t.toDoHours,
    overflowHours: Math.max(0, t.cumulative - budget),
    unsized: t.unsized,
  };
}

function forecastOne(
  plan: Planned,
  open: ScoredIssue[],
  closed: ScoredIssue[],
  byKey: Map<string, ScoredIssue>,
  taken: Set<string>,
  live: boolean,
  isCurrentMonth: boolean
): MonthForecast {
  const budget = planBudget(plan);
  const agreement = plan.agreed;
  // Counted before this month takes anything, so it is only earlier months'.
  const earlier = open.filter(
    (i) =>
      i.status !== "done" &&
      !isEpic(i) &&
      taken.has(issueKey(i)) &&
      i.assignees.some((a) => a.login === plan.person) &&
      plannedFeature(i, plan) !== null
  ).length;
  let missing = 0;
  const agreedIn = (lane: LaneKind): ScoredIssue[] => {
    const out: ScoredIssue[] = [];
    for (const t of agreement?.tickets ?? []) {
      if (t.lane !== lane) continue;
      const issue = byKey.get(t.key);
      // Typed Epic since it was agreed: context now, not work, so not counted.
      if (issue && isEpic(issue)) continue;
      if (issue) out.push(issue);
      else missing++;
    }
    return out;
  };

  let feature: LaneForecast;
  let maintenance: LaneForecast;
  let unassigned: ScoredIssue[];

  if (agreement && !live) {
    const agreedFeature = agreedIn("feature");
    const agreedMaintenance = agreedIn("maintenance");
    for (const i of [...agreedFeature, ...agreedMaintenance]) taken.add(issueKey(i));
    const rest = candidates(plan, open, taken);
    feature = agreedLane(budget.feature, agreedFeature, rest.feature, plan, true);
    maintenance = agreedLane(budget.maintenance, agreedMaintenance, rest.maintenance, plan, false);
    unassigned = rest.unassigned;
  } else {
    // Live. When an agreement is being updated, its tickets that are already
    // done stay in, so the new list keeps what got finished.
    const keepDone = (lane: LaneKind) => agreedIn(lane).filter((i) => rowState(i) === "done");
    const keptFeature = agreement ? keepDone("feature") : [];
    const keptMaintenance = agreement ? keepDone("maintenance") : [];
    for (const i of [...keptFeature, ...keptMaintenance]) taken.add(issueKey(i));
    const c = candidates(plan, open, taken);
    feature = liveLane(budget.feature, keptFeature, c.feature, plan, true);
    maintenance = liveLane(budget.maintenance, keptMaintenance, c.maintenance, plan, false);
    for (const lane of [feature, maintenance]) {
      for (const row of lane.rows) if (row.fits) taken.add(issueKey(row.issue));
    }
    unassigned = c.unassigned;
  }

  const adhoc = adhocLane(budget.adhoc, plan, agreement, agreedIn("adhoc"), [...closed, ...open], isCurrentMonth, byKey, taken);

  return { budget, feature, maintenance, adhoc, unassigned, earlier, missing, past: false };
}

/**
 * The forecast for one month.
 *
 * A month that is agreed shows its agreed tickets; one that isn't is a live
 * forecast of open work. In the feature and maintenance lanes, closed tickets
 * only ever count as an agreed ticket going to done, never because they
 * happened to close in the month. Ad hoc work is the exception (adhocLane).
 *
 * A later month starts where the months before it end: the current month
 * takes its tickets first, then each planned month after it, so December
 * shows what is left once November's share is taken. A month without a plan
 * takes nothing.
 *
 * `live` forecasts the month as if it were not agreed yet. That is what an
 * agreement is made from, and what updating one compares against.
 * `liveMonth` does the same for one month wherever it falls in the chain:
 * "what if this month were agreed again", for a preview.
 */
export function forecastMonth(input: {
  /** One person's plans. */
  plans: MonthPlan[];
  months: PlanMonth[];
  month: string;
  currentMonth: string;
  open: ScoredIssue[];
  closed: ScoredIssue[];
  live?: boolean;
  liveMonth?: string;
}): MonthForecast | null {
  const { plans, months, month, currentMonth, open, closed, live = false, liveMonth } = input;
  const featuresOf = (m: string) => months.find((x) => x.month === m)?.features ?? [];
  const planFor = (m: string): Planned | null => {
    const plan = plans.find((p) => p.month === m);
    return plan ? { ...plan, features: featuresOf(m) } : null;
  };
  const target = planFor(month);
  if (!target) return null;

  const byKey = new Map<string, ScoredIssue>();
  for (const i of [...closed, ...open]) byKey.set(issueKey(i), i);

  if (month < currentMonth) {
    // A past month is its agreement, done or not. Nothing open is forecast
    // into it, and without an agreement there is nothing to show.
    const past = forecastOne({ ...target, agreed: target.agreed ?? { at: "", tickets: [], inputs: "" } }, [], closed, byKey, new Set(), false, false);
    return { ...past, past: true };
  }

  const taken = new Set<string>();
  for (let m = currentMonth; m < month; m = addMonths(m, 1)) {
    const plan = planFor(m);
    if (plan) forecastOne(plan, open, closed, byKey, taken, m === liveMonth, m === currentMonth);
  }
  return forecastOne(target, open, closed, byKey, taken, live || month === liveMonth, month === currentMonth);
}

/** The agreement for a plan: what fits in its live forecast, lane by lane. */
export function agreementFrom(plan: MonthPlan, features: string[], liveForecast: MonthForecast): Agreement {
  const tickets: Agreement["tickets"] = [];
  for (const lane of LANE_KINDS) {
    for (const row of liveForecast[lane].rows) {
      if (row.fits) tickets.push({ key: issueKey(row.issue), lane });
    }
  }
  return { at: new Date().toISOString(), tickets, inputs: planInputs(plan, features) };
}

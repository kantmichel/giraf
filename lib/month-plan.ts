import { workKind, featureKey } from "@/lib/work-kind";
import type { ScoredIssue } from "@/lib/wsjf";
import type { FeatureRef } from "@/types/github";

/**
 * A month plan: what one person's month holds, agreed at the start of it.
 *
 * The plan only holds the inputs — hours, split, which features, hours per
 * effort. Which tickets fit is never stored: it is worked out from GitHub on
 * every load, so two Gira instances with the same plan show the same month.
 * The plan travels between instances as an exported file (see PlanExport).
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
  /** Feature Projects (`owner/number`) worked on this month, first first. */
  features: string[];
  focus: string;
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

export type LaneKind = "feature" | "maintenance";

export interface Agreement {
  at: string;
  /** In the order they were agreed, which is the order they get worked. */
  tickets: { key: string; lane: LaneKind }[];
  /** The plan's inputs when it was agreed, to tell when they changed since. */
  inputs: string;
}

/** What an agreement depends on. Focus is left out: rewording it changes no ticket. */
export function planInputs(plan: MonthPlan): string {
  return JSON.stringify([plan.regularHours, plan.investmentHours, plan.split, plan.effortHours, plan.features]);
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
    features: Array.isArray(r.features)
      ? r.features.filter((f): f is string => typeof f === "string")
      : [],
    focus: typeof r.focus === "string" ? r.focus : "",
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
      ((t as Record<string, unknown>).lane === "feature" || (t as Record<string, unknown>).lane === "maintenance")
  );
  return { at: r.at, tickets, inputs: typeof r.inputs === "string" ? r.inputs : "" };
}

/**
 * A new month starts from the one before it: the same hours, split and
 * estimates, since those rarely change month to month. Features and focus
 * start empty, because those are what the planning conversation decides.
 */
export function newMonthPlan(person: string, month: string, previous: MonthPlan | null): MonthPlan {
  return {
    person,
    month,
    regularHours: previous?.regularHours ?? 0,
    investmentHours: previous?.investmentHours ?? 0,
    split: { ...(previous?.split ?? DEFAULT_SPLIT) },
    effortHours: { ...(previous?.effortHours ?? DEFAULT_EFFORT_HOURS) },
    features: [],
    focus: "",
    agreed: null,
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Sharing between instances.

export const PLAN_EXPORT_KIND = "gira-month-plans";
export const PLAN_EXPORT_VERSION = 1;

/** The file sent between Gira instances. It holds all of a person's plans, so
 *  every month — and any total across months — matches on both sides. */
export interface PlanExport {
  kind: typeof PLAN_EXPORT_KIND;
  version: typeof PLAN_EXPORT_VERSION;
  person: string;
  exportedAt: string;
  plans: MonthPlan[];
}

export function parsePlanExport(raw: unknown): PlanExport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== PLAN_EXPORT_KIND || r.version !== PLAN_EXPORT_VERSION) return null;
  if (typeof r.person !== "string" || !r.person || !Array.isArray(r.plans)) return null;
  const plans = r.plans
    .map(parseMonthPlan)
    .filter((p): p is MonthPlan => p !== null && p.person === r.person);
  return {
    kind: PLAN_EXPORT_KIND,
    version: PLAN_EXPORT_VERSION,
    person: r.person,
    exportedAt: typeof r.exportedAt === "string" ? r.exportedAt : "",
    plans,
  };
}

// ---------------------------------------------------------------------------
// The forecast: which tickets fit in a month.

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
  /** Open tickets in this month's features assigned to someone else, or no one. */
  notAssigned: number;
  /** Agreed tickets that are no longer among the loaded issues (moved, deleted). */
  missing: number;
  /** A month before the current one. */
  past: boolean;
}

export function issueKey(issue: Pick<ScoredIssue, "repo" | "number">): string {
  return `${issue.repo.fullName}#${issue.number}`;
}

function hoursFor(issue: ScoredIssue, plan: MonthPlan): number | null {
  return issue.effort ? plan.effortHours[issue.effort] : null;
}

function rowState(issue: ScoredIssue): RowState {
  if (issue.state === "closed" || issue.status === "done") return "done";
  return issue.status === "doing" || issue.status === "in review" ? "in progress" : "to do";
}

function plannedFeature(issue: ScoredIssue, plan: MonthPlan): FeatureRef | null {
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
function addIn(t: Tally, issue: ScoredIssue, plan: MonthPlan, withFeature: boolean): void {
  const hours = hoursFor(issue, plan);
  const state = rowState(issue);
  if (hours === null) t.unsized++;
  t.cumulative += hours ?? 0;
  if (state === "done") t.doneHours += hours ?? 0;
  else if (state === "in progress") t.inProgressHours += hours ?? 0;
  else t.toDoHours += hours ?? 0;
  t.rows.push({ issue, hours, state, cumulative: t.cumulative, fits: true, feature: withFeature ? plannedFeature(issue, plan) : null });
}

/**
 * A live lane: work laid in order until the hours run out. The line is
 * strict — no smaller ticket skips ahead to fill a gap — because the order is
 * the agreement: features in their Project's order, maintenance by WSJF.
 * `keep` is work carried over from an earlier agreement that is already done,
 * so updating an agreement mid-month doesn't forget what got finished.
 */
function liveLane(budget: number, keep: ScoredIssue[], open: ScoredIssue[], plan: MonthPlan, withFeature: boolean): LaneForecast {
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
      unsizedRows.push({ issue, hours, state: rowState(issue), cumulative: t.cumulative, fits: false, feature });
      continue;
    }
    // A hundredth of an hour of slack, so 0.1 + 0.2 style sums fit exactly.
    if (below.length === 0 && t.cumulative + hours <= budget + 0.01) {
      addIn(t, issue, plan, withFeature);
    } else {
      overflowHours += hours;
      below.push({ issue, hours, state: rowState(issue), cumulative: t.cumulative + overflowHours, fits: false, feature });
    }
  }
  return { budget, agreed: false, rows: [...t.rows, ...below, ...unsizedRows], doneHours: t.doneHours, inProgressHours: t.inProgressHours, toDoHours: t.toDoHours, overflowHours, unsized: t.unsized };
}

/** An agreed lane: the agreed tickets, then what else is waiting, for reference. */
function agreedLane(budget: number, agreed: ScoredIssue[], rest: ScoredIssue[], plan: MonthPlan, withFeature: boolean): LaneForecast {
  const t = newTally();
  for (const issue of agreed) addIn(t, issue, plan, withFeature);
  let after = t.cumulative;
  const restRows: PlanRow[] = rest.map((issue) => {
    const hours = hoursFor(issue, plan);
    after += hours ?? 0;
    return { issue, hours, state: rowState(issue), cumulative: after, fits: false, feature: withFeature ? plannedFeature(issue, plan) : null };
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
function candidates(plan: MonthPlan, open: ScoredIssue[], taken: Set<string>) {
  const mine = (i: ScoredIssue) => i.assignees.some((a) => a.login === plan.person);
  const inPlannedFeature = (i: ScoredIssue) => plannedFeature(i, plan) !== null;
  // An open ticket already marked `status: done` is finished work waiting to
  // be closed, not something to pick up.
  const openMine = open.filter((i) => mine(i) && i.status !== "done" && !taken.has(issueKey(i)));

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

  // Maintenance lane: everything that is not feature work, top down by WSJF.
  const maintenance = openMine
    .filter((i) => !inPlannedFeature(i) && workKind(i) !== "feature")
    .sort((a, b) => inProgressFirst(a, b) || byWsjf(a, b));

  const notAssigned = open.filter((i) => inPlannedFeature(i) && !mine(i) && i.state === "open").length;
  return { feature, maintenance, notAssigned };
}

function forecastOne(
  plan: MonthPlan,
  open: ScoredIssue[],
  byKey: Map<string, ScoredIssue>,
  taken: Set<string>,
  live: boolean
): MonthForecast {
  const budget = planBudget(plan);
  const agreement = plan.agreed;
  let missing = 0;
  const agreedIn = (lane: LaneKind): ScoredIssue[] => {
    const out: ScoredIssue[] = [];
    for (const t of agreement?.tickets ?? []) {
      if (t.lane !== lane) continue;
      const issue = byKey.get(t.key);
      if (issue) out.push(issue);
      else missing++;
    }
    return out;
  };

  let feature: LaneForecast;
  let maintenance: LaneForecast;
  let notAssigned: number;

  if (agreement && !live) {
    const agreedFeature = agreedIn("feature");
    const agreedMaintenance = agreedIn("maintenance");
    for (const i of [...agreedFeature, ...agreedMaintenance]) taken.add(issueKey(i));
    const rest = candidates(plan, open, taken);
    feature = agreedLane(budget.feature, agreedFeature, rest.feature, plan, true);
    maintenance = agreedLane(budget.maintenance, agreedMaintenance, rest.maintenance, plan, false);
    notAssigned = rest.notAssigned;
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
    notAssigned = c.notAssigned;
  }

  return { budget, feature, maintenance, notAssigned, missing, past: false };
}

/**
 * The forecast for one month.
 *
 * A month that is agreed shows its agreed tickets; one that isn't is a live
 * forecast of open work. Closed tickets only ever count as an agreed ticket
 * going to done, never because they happened to close in the month.
 *
 * A later month starts where the months before it end: the current month
 * takes its tickets first, then each planned month after it, so December
 * shows what is left once November's share is taken. A month without a plan
 * takes nothing.
 *
 * `live` forecasts the month as if it were not agreed yet. That is what an
 * agreement is made from, and what updating one compares against.
 */
export function forecastMonth(input: {
  plans: MonthPlan[];
  month: string;
  currentMonth: string;
  open: ScoredIssue[];
  closed: ScoredIssue[];
  live?: boolean;
}): MonthForecast | null {
  const { plans, month, currentMonth, open, closed, live = false } = input;
  const planFor = (m: string) => plans.find((p) => p.month === m) ?? null;
  const target = planFor(month);
  if (!target) return null;

  const byKey = new Map<string, ScoredIssue>();
  for (const i of [...closed, ...open]) byKey.set(issueKey(i), i);

  if (month < currentMonth) {
    // A past month is its agreement, done or not. Nothing open is forecast
    // into it, and without an agreement there is nothing to show.
    const past = forecastOne({ ...target, agreed: target.agreed ?? { at: "", tickets: [], inputs: "" } }, [], byKey, new Set(), false);
    return { ...past, past: true };
  }

  const taken = new Set<string>();
  for (let m = currentMonth; m < month; m = addMonths(m, 1)) {
    const plan = planFor(m);
    if (plan) forecastOne(plan, open, byKey, taken, false);
  }
  return forecastOne(target, open, byKey, taken, live);
}

/** The agreement for a plan: what fits in its live forecast, lane by lane. */
export function agreementFrom(plan: MonthPlan, liveForecast: MonthForecast): Agreement {
  const tickets: Agreement["tickets"] = [];
  for (const lane of ["feature", "maintenance"] as const) {
    for (const row of liveForecast[lane].rows) {
      if (row.fits) tickets.push({ key: issueKey(row.issue), lane });
    }
  }
  return { at: new Date().toISOString(), tickets, inputs: planInputs(plan) };
}

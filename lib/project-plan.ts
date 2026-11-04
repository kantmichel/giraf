import { EPIC_ISSUE_TYPE, featureKey, workKind } from "@/lib/work-kind";
import type { ScoredIssue } from "@/lib/wsjf";
import type { FeatureProject, ProjectItem } from "@/lib/github/projects";
import {
  DEFAULT_EFFORT_HOURS,
  addMonths,
  forecastMonth,
  issueKey,
  planMonthFor,
  teamOf,
  withFeature,
  type MonthForecast,
  type MonthPlan,
  type PlanMonth,
} from "@/lib/month-plan";

/**
 * A feature Project seen from above: what is left of it, whose hours it needs,
 * and where in the plan it lands. Where it lands comes from forecastMonth, the
 * same forecast the month view shows, so the overview and the month never
 * disagree about what fits.
 */

type Effort = "low" | "medium" | "high";

export interface PersonShare {
  person: string;
  /** Hours of open, sized tickets assigned to them. */
  hours: number;
  tickets: number;
  unsized: number;
}

export interface ProjectSummary {
  project: FeatureProject;
  key: string;
  openTickets: number;
  doneTickets: number;
  /** Items in repos Gira doesn't track: in the Project, but in no plan. */
  untracked: number;
  /** Hours of open work, everyone's together, unassigned included. A ticket
   *  with two assignees counts for both, as it does in both their months. */
  hours: number;
  efforts: Record<Effort, number>;
  /** The typical ticket: the effort level nearest the average. */
  averageEffort: Effort | null;
  unsized: number;
  people: PersonShare[];
  /** Open tickets nobody is assigned to: no one's month can take them. */
  unassigned: { tickets: number; hours: number; unsized: number; issues: ScoredIssue[] };
  /** Its open, not-done tickets in tracked repos. */
  openIssues: ScoredIssue[];
  /** Months whose features include it, earliest first. */
  months: string[];
  /** Its epic: the Project's context, left out of everything above. */
  epic: Epic | null;
  /** No epic typed, but one item is the parent of several others here:
   *  likely the epic, offered to be marked as one. */
  epicSuggestion: { item: ProjectItem; issue: ScoredIssue | null; children: number } | null;
}

export type EpicStatus = "to do" | "in progress" | "done";

export interface Epic {
  item: ProjectItem;
  url: string;
  /** The loaded issue, when it is open in a tracked repo. */
  issue: ScoredIssue | null;
  /** What its status says now; null when Gira can't see it (an untracked repo). */
  status: EpicStatus | null;
  /** What its tickets say it should be: in progress from the first ticket
   *  started, done once every ticket is. */
  wanted: EpicStatus;
}

const issueUrl = (i: Pick<ProjectItem, "owner" | "repo" | "number">) => `https://github.com/${i.owner}/${i.repo}/issues/${i.number}`;

export interface PlanContext {
  plans: MonthPlan[];
  months: PlanMonth[];
  currentMonth: string;
  open: ScoredIssue[];
  closed: ScoredIssue[];
}

/** The hours a person's effort labels stand for: their plan for now, or the
 *  nearest one they have, so the overview counts as their months do. */
function effortHoursOf(person: string, plans: MonthPlan[], currentMonth: string): MonthPlan["effortHours"] {
  const mine = plans.filter((p) => p.person === person).sort((a, b) => a.month.localeCompare(b.month));
  const now = [...mine].reverse().find((p) => p.month <= currentMonth) ?? mine[0];
  return now?.effortHours ?? DEFAULT_EFFORT_HOURS;
}

const isDone = (i: ScoredIssue) => i.state === "closed" || i.status === "done";
const assignedTo = (i: ScoredIssue, person: string) => i.assignees.some((a) => a.login === person);

export function summarizeProject(
  project: FeatureProject,
  ctx: PlanContext,
  trackedRepos: Set<string>
): ProjectSummary {
  const key = featureKey(project);
  const openByKey = new Map(ctx.open.map((i) => [issueKey(i), i]));
  const efforts: Record<Effort, number> = { low: 0, medium: 0, high: 0 };
  const people = new Map<string, PersonShare>();
  const unassigned = { tickets: 0, hours: 0, unsized: 0, issues: [] as ScoredIssue[] };
  const openIssues: ScoredIssue[] = [];
  let doneTickets = 0;
  let untracked = 0;
  let unsized = 0;
  let started = 0;

  // The epic: typed in the Project data, or since then on the loaded issue.
  const loaded = (i: ProjectItem) => openByKey.get(`${i.owner}/${i.repo}#${i.number}`) ?? null;
  const epicItem =
    project.epic ?? project.items.find((i) => workKind(loaded(i) ?? { issueType: null }) === "epic") ?? null;
  const isEpicItem = (i: ProjectItem) =>
    i.type === EPIC_ISSUE_TYPE || (!!epicItem && i.owner === epicItem.owner && i.repo === epicItem.repo && i.number === epicItem.number);

  for (const item of project.items) {
    if (isEpicItem(item)) continue;
    if (!trackedRepos.has(`${item.owner}/${item.repo}`)) {
      untracked++;
      continue;
    }
    // Every open issue of a tracked repo is loaded, so one that isn't is closed.
    const issue = openByKey.get(`${item.owner}/${item.repo}#${item.number}`);
    if (!issue || isDone(issue)) {
      doneTickets++;
      continue;
    }
    openIssues.push(issue);
    if (issue.status === "doing" || issue.status === "in review") started++;
    if (issue.effort) efforts[issue.effort]++;
    else unsized++;
    if (issue.assignees.length === 0) {
      unassigned.tickets++;
      unassigned.issues.push(issue);
      if (issue.effort) unassigned.hours += DEFAULT_EFFORT_HOURS[issue.effort];
      else unassigned.unsized++;
    }
    for (const { login } of issue.assignees) {
      const share = people.get(login) ?? { person: login, hours: 0, tickets: 0, unsized: 0 };
      share.tickets++;
      if (issue.effort) share.hours += effortHoursOf(login, ctx.plans, ctx.currentMonth)[issue.effort];
      else share.unsized++;
      people.set(login, share);
    }
  }

  let epic: Epic | null = null;
  if (epicItem) {
    const issue = loaded(epicItem);
    const status: EpicStatus | null = epicItem.closed
      ? "done"
      : issue
        ? issue.status === "done"
          ? "done"
          : issue.status === "doing" || issue.status === "in review"
            ? "in progress"
            : "to do"
        : null;
    const wanted: EpicStatus =
      openIssues.length === 0 && doneTickets > 0 ? "done" : started + doneTickets > 0 ? "in progress" : "to do";
    epic = { item: epicItem, url: issueUrl(epicItem), issue, status, wanted };
  }

  // Where none is typed: the item most other items here have as their parent,
  // when at least two do. One child is as likely a ticket with a sub-issue.
  let epicSuggestion: ProjectSummary["epicSuggestion"] = null;
  if (!epicItem) {
    const children = new Map<string, number>();
    for (const i of project.items) if (i.parent) children.set(i.parent, (children.get(i.parent) ?? 0) + 1);
    const [best] = Array.from(children).sort((a, b) => b[1] - a[1]);
    const item = best && best[1] >= 2 ? project.items.find((i) => `${i.owner}/${i.repo}#${i.number}` === best[0]) : undefined;
    if (item) epicSuggestion = { item, issue: loaded(item), children: best[1] };
  }

  const sized = efforts.low + efforts.medium + efforts.high;
  const mean = sized ? (efforts.low + 2 * efforts.medium + 3 * efforts.high) / sized : 0;
  const shares = Array.from(people.values()).sort((a, b) => b.hours - a.hours || a.person.localeCompare(b.person));
  return {
    project,
    key,
    openTickets: openIssues.length,
    doneTickets,
    untracked,
    hours: shares.reduce((sum, s) => sum + s.hours, 0) + unassigned.hours,
    efforts,
    averageEffort: sized ? (["low", "medium", "high"] as const)[Math.round(mean) - 1] : null,
    unsized,
    people: shares,
    unassigned,
    openIssues,
    months: ctx.months.filter((m) => m.features.includes(key)).map((m) => m.month).sort(),
    epic,
    epicSuggestion,
  };
}

/** What would bring the epic's status in line with its tickets, if anything.
 *  Never back: an epic someone moved ahead by hand is left alone. */
export function epicAction(epic: Epic | null): "start" | "close" | null {
  if (!epic || !epic.issue || epic.status === null) return null;
  if (epic.wanted === "done" && epic.status !== "done") return "close";
  if (epic.wanted === "in progress" && epic.status === "to do") return "start";
  return null;
}

// ---------------------------------------------------------------------------
// Forecasts, once per load: every person's planned months from now on.

export interface PlanForecasts {
  /** Months from now on that someone has a plan in, earliest first. */
  months: string[];
  team: string[];
  get(person: string, month: string): MonthForecast | null;
}

/** Every person's forecast for every month they have planned from now on.
 *  Computed once and read by every Project, rather than once per Project. */
export function forecastPlans(ctx: PlanContext, liveMonth?: string): PlanForecasts {
  const team = teamOf(ctx.plans);
  const months = Array.from(new Set(ctx.plans.map((p) => p.month).filter((m) => m >= ctx.currentMonth))).sort();
  const byKey = new Map<string, MonthForecast>();
  for (const person of team) {
    const plans = ctx.plans.filter((p) => p.person === person);
    for (const month of months) {
      const f = forecastMonth({ plans, months: ctx.months, month, currentMonth: ctx.currentMonth, open: ctx.open, closed: ctx.closed, liveMonth });
      if (f) byKey.set(`${person} ${month}`, f);
    }
  }
  return { months, team, get: (person, month) => byKey.get(`${person} ${month}`) ?? null };
}

// ---------------------------------------------------------------------------
// Where a Project lands.

export interface Placement {
  month: string;
  /** Hours of the Project's open work that fit in this month. */
  hours: number;
  people: { person: string; hours: number; hasPlan: boolean }[];
}

/** An assigned, sized ticket no planned month takes for that person. */
export interface LeftTicket {
  issue: ScoredIssue;
  person: string;
  hours: number;
  /** The last month it was listed in without fitting: below the line, or
   *  left out of an agreed list. Null when no month listed it at all. */
  outOf: { month: string; agreed: boolean } | null;
  /** The person has plans in Gira, so planning a month gives them one there. */
  inTeam: boolean;
}

export interface ProjectForecast {
  /** Per month it is planned in, from now on. */
  placements: Placement[];
  /** Assigned work that no planned month takes. Unassigned and unsized
   *  tickets are not in it: no month can take those (see the summary). */
  left: LeftTicket[];
  leftHours: number;
  /** The last month it is planned in, past months included. */
  lastMonth: string | null;
  /** Where its left work would go next: the month after the last one. */
  finishIn: string;
}

/**
 * Where a Project's open work lands: per month it is planned in, from now on,
 * the hours of it that fit in each person's feature lane, and what is left
 * after them. A ticket counts as placed wherever it fits, even when another
 * planned feature it also belongs to is what took it.
 */
export function placeProject(summary: ProjectSummary, ctx: PlanContext, forecasts: PlanForecasts): ProjectForecast {
  const inProject = new Set(summary.openIssues.map(issueKey));
  const placedFor = new Map<string, Set<string>>();
  const outOfFor = new Map<string, Map<string, { month: string; agreed: boolean }>>();
  const planned = new Set(summary.months);
  const placements: Placement[] = [];

  for (const month of forecasts.months) {
    const people = summary.people.map(({ person }) => {
      const f = forecasts.get(person, month);
      if (!f) return { person, hours: 0, hasPlan: false };
      const placed = placedFor.get(person) ?? new Set<string>();
      const outOf = outOfFor.get(person) ?? new Map();
      let hours = 0;
      for (const row of f.feature.rows) {
        const key = issueKey(row.issue);
        if (!inProject.has(key) || row.state === "done") continue;
        if (row.fits) {
          placed.add(key);
          hours += row.hours ?? 0;
        } else {
          outOf.set(key, { month, agreed: f.feature.agreed });
        }
      }
      placedFor.set(person, placed);
      outOfFor.set(person, outOf);
      return { person, hours, hasPlan: true };
    });
    if (planned.has(month)) placements.push({ month, hours: people.reduce((sum, p) => sum + p.hours, 0), people });
  }

  const team = new Set(forecasts.team);
  const left: LeftTicket[] = [];
  for (const { person } of summary.people) {
    const effortHours = effortHoursOf(person, ctx.plans, ctx.currentMonth);
    for (const issue of summary.openIssues) {
      if (!issue.effort || !assignedTo(issue, person) || placedFor.get(person)?.has(issueKey(issue))) continue;
      left.push({
        issue,
        person,
        hours: effortHours[issue.effort],
        outOf: outOfFor.get(person)?.get(issueKey(issue)) ?? null,
        inTeam: team.has(person),
      });
    }
  }

  const lastMonth = summary.months[summary.months.length - 1] ?? null;
  return {
    placements,
    left,
    leftHours: left.reduce((sum, t) => sum + t.hours, 0),
    lastMonth,
    finishIn: !lastMonth || lastMonth < ctx.currentMonth ? ctx.currentMonth : addMonths(lastMonth, 1),
  };
}

export interface PlanningPreview {
  forecast: ProjectForecast;
  /** Hours of it planned months before this one take. */
  before: number;
  inMonth: number;
  /** Hours of it that still don't fit with the month added. */
  after: number;
  /** Other features' work in this month that it pushes below the line, by
   *  feature: what going first costs. */
  pushed: { title: string; hours: number }[];
}

/**
 * What planning a Project into a month would do, before it is done: the same
 * change the page makes (the month and its plans created where missing, the
 * Project put where withFeature puts it), forecast with that month as if
 * agreed again, compared with the month as it is.
 */
export function previewPlanning(summary: ProjectSummary, month: string, ctx: PlanContext): PlanningPreview {
  const created = planMonthFor(month, ctx.plans, ctx.months);
  const plans = [...ctx.plans, ...created.plans];
  const base = created.month ?? ctx.months.find((m) => m.month === month)!;
  const months = [
    ...ctx.months.filter((m) => m.month !== month),
    { ...base, features: withFeature(base, summary.key, ctx.months) },
  ];
  const next: PlanContext = { ...ctx, plans, months };
  const nextSummary = { ...summary, months: Array.from(new Set([...summary.months, month])).sort() };
  const after = forecastPlans(next, month);
  const forecast = placeProject(nextSummary, next, after);

  // What else fits in the month, without it and with it.
  const before = forecastPlans({ ...ctx, plans }, month);
  const inProject = new Set(summary.openIssues.map(issueKey));
  const pushed = new Map<string, number>();
  for (const person of after.team) {
    const was = before.get(person, month);
    const now = after.get(person, month);
    if (!was || !now) continue;
    const fitsNow = new Set(now.feature.rows.filter((r) => r.fits).map((r) => issueKey(r.issue)));
    for (const row of was.feature.rows) {
      if (!row.fits || row.state === "done" || inProject.has(issueKey(row.issue)) || fitsNow.has(issueKey(row.issue))) continue;
      const title = row.feature?.title ?? "other work";
      pushed.set(title, (pushed.get(title) ?? 0) + (row.hours ?? 0));
    }
  }

  const sumHours = (list: Placement[]) => list.reduce((sum, p) => sum + p.hours, 0);
  return {
    forecast,
    before: sumHours(forecast.placements.filter((p) => p.month < month)),
    inMonth: forecast.placements.find((p) => p.month === month)?.hours ?? 0,
    after: sumHours(forecast.placements.filter((p) => p.month > month)) + forecast.leftHours,
    pushed: Array.from(pushed, ([title, hours]) => ({ title, hours })).filter((p) => p.hours > 0),
  };
}

/**
 * Projects started before `month` that still have work left after their last
 * planned month: the ones to finish first in it. A Project never planned is
 * new work, not something to finish, so it isn't one of them.
 */
export function projectsToFinish(
  month: string,
  summaries: ProjectSummary[],
  ctx: PlanContext,
  forecasts: PlanForecasts
): { summary: ProjectSummary; forecast: ProjectForecast }[] {
  if (month < ctx.currentMonth) return [];
  return summaries
    .filter((s) => s.months.length > 0 && s.months[s.months.length - 1] < month)
    .map((summary) => ({ summary, forecast: placeProject(summary, ctx, forecasts) }))
    .filter(({ forecast }) => forecast.left.some((t) => t.inTeam));
}

// ---------------------------------------------------------------------------
// How full each month is.

export interface MonthLoad {
  month: string;
  people: {
    person: string;
    hasPlan: boolean;
    budget: number;
    used: number;
    /** Planned work below the line: in the month's features, but past its hours. */
    over: number;
    overTickets: { label: string; feature: string; hours: number }[];
  }[];
}

/** How full each person's feature hours are, month by month: what a Project
 *  planned there competes with. An agreed month shows its agreed list, so
 *  nothing is over there unless the list itself runs past the hours. */
export function monthLoads(monthsToShow: string[], forecasts: PlanForecasts): MonthLoad[] {
  return monthsToShow.map((month) => ({
    month,
    people: forecasts.team.map((person) => {
      const f = forecasts.get(person, month);
      if (!f) return { person, hasPlan: false, budget: 0, used: 0, over: 0, overTickets: [] };
      const lane = f.feature;
      const overTickets = lane.agreed
        ? []
        : lane.rows
            .filter((r) => !r.fits && r.hours !== null)
            .map((r) => ({ label: `${r.issue.repo.name}#${r.issue.number}`, feature: r.feature?.title ?? "", hours: r.hours ?? 0 }));
      return {
        person,
        hasPlan: true,
        budget: lane.budget,
        used: lane.doneHours + lane.inProgressHours + lane.toDoHours,
        over: lane.overflowHours,
        overTickets,
      };
    }),
  }));
}

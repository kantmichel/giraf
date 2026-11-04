"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Download, FolderKanban, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIssues } from "@/hooks/use-issues";
import {
  useDeleteMonthPlan,
  useFeatureProjects,
  useImportMonthPlans,
  useMonthPlans,
  useSavePlans,
  type PlansChange,
} from "@/hooks/use-month-plans";
import { useTrackedRepos } from "@/hooks/use-tracked-repos";
import { formatInstantWithTime, formatMonth } from "@/lib/format-date";
import {
  PLAN_EXPORT_KIND,
  PLAN_EXPORT_VERSION,
  addMonths,
  agreementFrom,
  forecastMonth,
  formatHours,
  isMonth,
  monthOf,
  newPlanMonth,
  parsePlanExport,
  planInputs,
  planMonthFor,
  teamOf,
  withFeature,
  type LaneKind,
  type MonthPlan,
  type PlanExport,
  type PlanMonth,
} from "@/lib/month-plan";
import { forecastPlans, projectsToFinish, summarizeProject, type PlanContext } from "@/lib/project-plan";
import { cn } from "@/lib/utils";
import type { FilterConfig } from "@/types/github";
import { PlanFeatures } from "./plan-features";
import { PlanFinish, TicketLinks } from "./plan-finish";
import { PlanLanes } from "./plan-lanes";
import { PlanProjects } from "./plan-projects";
import { PlanTable } from "./plan-table";

const NO_FILTERS: Omit<FilterConfig, "state"> = {
  repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], age: [], ai: [],
  version: [], hasPr: false, milestone: [], type: [], feature: [], search: "",
};
const OPEN: FilterConfig = { ...NO_FILTERS, state: "open" };
const CLOSED: FilterConfig = { ...NO_FILTERS, state: "closed" };

/** Saves are held back this long after the last keystroke. */
const SAVE_DELAY_MS = 500;

function NumberBox({
  label,
  value,
  onChange,
  suffix,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) && n >= 0 ? n : 0);
          }}
          className="h-8 w-20 tabular-nums"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

/** Replace the entries of `list` that `same` matches with `next`. */
function withChanged<T>(list: T[], next: T[], same: (a: T, b: T) => boolean): T[] {
  return [...list.filter((x) => !next.some((n) => same(x, n))), ...next];
}
const samePlan = (a: MonthPlan, b: MonthPlan) => a.person === b.person && a.month === b.month;
const sameMonth = (a: PlanMonth, b: PlanMonth) => a.month === b.month;

export function PlanView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const currentMonth = monthOf(new Date());
  const monthParam = searchParams.get("month");
  const month = isMonth(monthParam) ? monthParam : currentMonth;

  const plansQuery = useMonthPlans();
  const storedPlans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data?.plans]);
  const storedMonths = useMemo(() => plansQuery.data?.months ?? [], [plansQuery.data?.months]);
  const projectsQuery = useFeatureProjects();
  const projects = useMemo(() => projectsQuery.data?.projects ?? [], [projectsQuery.data?.projects]);
  const trackedQuery = useTrackedRepos();
  const trackedRepos = useMemo(
    () => new Set((trackedQuery.data ?? []).map((r) => `${r.owner}/${r.repo}`)),
    [trackedQuery.data]
  );

  // The person defaults to whoever was planned most recently, since the page
  // is mostly used to plan someone else's month.
  const lastPlanned = [...storedPlans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.person;
  const person = searchParams.get("person") || lastPlanned || session?.user?.githubUsername || "";

  const { allIssues: open, isLoading: openLoading } = useIssues(OPEN);
  // Closed work counts toward the month it was closed in, so closed issues are
  // needed back to the start of the earlier of the shown and the current month.
  const closedSince = useMemo(() => {
    const [y, m] = (month < currentMonth ? month : currentMonth).split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [month, currentMonth]);
  const { allIssues: closed } = useIssues(CLOSED, 0, { closedSince });

  const setParams = useCallback(
    (updates: { month?: string; person?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.month) params.set("month", updates.month);
      if (updates.person) params.set("person", updates.person);
      router.replace(`/plan?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // --- editing -------------------------------------------------------------
  // Edits go to local copies — the person's plan and the shared month — saved
  // together shortly after the last change. A local copy wins over the cache
  // for as long as it is for what's on screen, so a reply to an earlier save
  // can't undo what was typed since. Importing or deleting drops them.
  const savePlans = useSavePlans();
  const { mutate: save } = savePlans; // stable across renders
  const deletePlan = useDeleteMonthPlan();
  const planKey = `${person}|${month}`;
  const [localPlan, setLocalPlan] = useState<{ key: string; plan: MonthPlan } | null>(null);
  const [localMonth, setLocalMonth] = useState<PlanMonth | null>(null);
  const stored = storedPlans.find((p) => p.person === person && p.month === month) ?? null;
  const draft = localPlan && localPlan.key === planKey ? localPlan.plan : stored;
  const draftMonth =
    (localMonth && localMonth.month === month ? localMonth : storedMonths.find((m) => m.month === month)) ?? null;
  const features = useMemo(() => draftMonth?.features ?? [], [draftMonth]);

  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; plans: MonthPlan[]; months: PlanMonth[] } | null>(null);

  const flush = useCallback(() => {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    const { plans, months } = pending.current;
    pending.current = null;
    save({ plans, months });
  }, [save]);

  /** Save a change now, together with whatever is waiting, as one save: two
   *  saves in a row could have the first one's reply undo the second. */
  const saveNow = (change: PlansChange) => {
    const plans = withChanged(pending.current?.plans ?? [], change.plans ?? [], samePlan);
    const months = withChanged(pending.current?.months ?? [], change.months ?? [], sameMonth);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    if (plans.length || months.length) save({ plans, months });
  };

  const discardPending = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  };

  // Switching month or person, or leaving the page, saves what is waiting.
  useEffect(() => () => flush(), [flush, planKey]);

  const queue = (change: PlansChange) => {
    const plans = withChanged(pending.current?.plans ?? [], change.plans ?? [], samePlan);
    const months = withChanged(pending.current?.months ?? [], change.months ?? [], sameMonth);
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { plans, months, timer: setTimeout(flush, SAVE_DELAY_MS) };
  };

  const edit = (update: Partial<MonthPlan>) => {
    if (!draft) return;
    const next = { ...draft, ...update };
    setLocalPlan({ key: planKey, plan: next });
    queue({ plans: [next] });
  };

  const editMonth = (update: Partial<Omit<PlanMonth, "month">>) => {
    const next = { ...(draftMonth ?? newPlanMonth(month)), ...update };
    setLocalMonth(next);
    queue({ months: [next] });
  };

  // Everything as it stands, local edits included: what forecasts and the
  // Projects overview read.
  const allPlans = useMemo(() => (draft ? withChanged(storedPlans, [draft], samePlan) : storedPlans), [storedPlans, draft]);
  const allMonths = useMemo(
    () => (draftMonth ? withChanged(storedMonths, [draftMonth], sameMonth) : storedMonths),
    [storedMonths, draftMonth]
  );
  const personPlans = useMemo(() => allPlans.filter((p) => p.person === person), [allPlans, person]);

  const forecast = useMemo(
    () => (draft ? forecastMonth({ plans: personPlans, months: allMonths, month, currentMonth, open, closed }) : null),
    [draft, personPlans, allMonths, month, currentMonth, open, closed]
  );

  const [lane, setLane] = useState<LaneKind>("feature");
  const [projectsOpen, setProjectsOpen] = useState(false);

  /** Plan a month for everyone at once: the month, and a plan for each
   *  person in the team who has none there yet (plus `extra`). */
  const planMonth = (m: string, extra: string[] = []) => {
    const created = planMonthFor(m, allPlans, allMonths, extra);
    saveNow({ plans: created.plans, months: created.month ? [created.month] : [] });
  };

  /** Change a month's features from the Projects overview or the "Finish
   *  first" banner, planning the month for everyone if it isn't yet. Saved
   *  at once. */
  const changeFeatures = (m: string, change: (month: PlanMonth) => string[]) => {
    const created = planMonthFor(m, allPlans, allMonths);
    const base = created.month ?? allMonths.find((x) => x.month === m)!;
    setLocalMonth(null);
    saveNow({ plans: created.plans, months: [{ ...base, features: change(base) }] });
  };
  const addFeature = (key: string, m: string) => changeFeatures(m, (base) => withFeature(base, key, allMonths));

  // --- agreeing ---------------------------------------------------------------
  // Agreeing saves what fits right now as the person's list for the month.
  // Updating does the same, keeping agreed tickets that are already done.
  const agree = () => {
    if (!draft) return;
    const live = forecastMonth({ plans: personPlans, months: allMonths, month, currentMonth, open, closed, live: true });
    if (!live) return;
    edit({ agreed: agreementFrom(draft, features, live) });
    flush();
  };
  const agreedChanged = !!draft?.agreed && draft.agreed.inputs !== planInputs(draft, features);

  // --- people ----------------------------------------------------------------
  const people = useMemo(() => {
    const set = new Set<string>(storedPlans.map((p) => p.person));
    for (const issue of open) for (const a of issue.assignees) set.add(a.login);
    if (person) set.add(person);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [storedPlans, open, person]);
  const team = teamOf(allPlans);

  // --- export and import ---------------------------------------------------
  const fileInput = useRef<HTMLInputElement>(null);
  const importPlans = useImportMonthPlans();

  const exportPlans = () => {
    flush();
    const file: PlanExport = {
      kind: PLAN_EXPORT_KIND,
      version: PLAN_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      plans: [...allPlans].sort((a, b) => a.month.localeCompare(b.month) || a.person.localeCompare(b.person)),
      months: [...allMonths].sort((a, b) => a.month.localeCompare(b.month)),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "gira-plans.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (fileList: FileList | null) => {
    const picked = fileList?.[0];
    if (fileInput.current) fileInput.current.value = "";
    if (!picked) return;
    let parsed: PlanExport | null = null;
    try {
      parsed = parsePlanExport(JSON.parse(await picked.text()));
    } catch {
      parsed = null;
    }
    if (!parsed) {
      alert("This file is not a Gira plan export, or it comes from an older Gira: ask for a new export.");
      return;
    }
    const who = teamOf(parsed.plans).join(", ") || "nobody";
    const ok = confirm(
      `Replace all plans here with the ${parsed.plans.length} in this file (${who}, over ${parsed.months.length} months)?`
    );
    if (!ok) return;
    discardPending();
    importPlans.mutate(parsed, {
      onSuccess: () => {
        setLocalPlan(null);
        setLocalMonth(null);
      },
    });
  };

  // --- render ---------------------------------------------------------------
  const monthLabel = formatMonth(month);
  const previousPlan =
    [...personPlans].filter((p) => p.month < month).sort((a, b) => b.month.localeCompare(a.month))[0] ?? null;
  const splitTotal = draft ? draft.split.feature + draft.split.maintenance + draft.split.adhoc : 100;
  const projectErrors = projectsQuery.data?.errors ?? [];
  const plannedHere = new Set(allPlans.filter((p) => p.month === month).map((p) => p.person));
  const toPlan = Array.from(new Set([...team, person].filter(Boolean))).filter((p) => !plannedHere.has(p));
  const projectCtx: PlanContext = useMemo(
    () => ({ plans: allPlans, months: allMonths, currentMonth, open, closed }),
    [allPlans, allMonths, currentMonth, open, closed]
  );
  // Every Project's summary, once the issues are in: its size for picking it,
  // and what is left of it for the "Finish first" banner.
  const summaries = useMemo(
    () => (openLoading ? [] : projects.map((p) => summarizeProject(p, projectCtx, trackedRepos))),
    [openLoading, projects, projectCtx, trackedRepos]
  );
  const projectSizes = useMemo(
    () => new Map(summaries.map((s) => [s.key, { hours: s.hours, months: s.months }])),
    [summaries]
  );
  // Projects started before this month with work left after their last month.
  const toFinish = useMemo(() => {
    if (month < currentMonth) return [];
    const started = summaries.filter((s) => s.months.length > 0 && !s.months.includes(month));
    return started.length ? projectsToFinish(month, started, projectCtx, forecastPlans(projectCtx)) : [];
  }, [month, currentMonth, summaries, projectCtx]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold">Plan</h1>
        <Select value={person} onValueChange={(p) => setParams({ person: p })}>
          <SelectTrigger className="h-8 w-48" aria-label="Person">
            <SelectValue placeholder="Person" />
          </SelectTrigger>
          <SelectContent>
            {people.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          {/* Always takes its space, and sits left of the arrows: when it
              appeared on leaving this month, everything right-aligned shifted
              and a second click on "next" landed on it. */}
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-xs", month === currentMonth && "invisible")}
            onClick={() => setParams({ month: currentMonth })}
            disabled={month === currentMonth}
            aria-hidden={month === currentMonth}
            tabIndex={month === currentMonth ? -1 : undefined}
          >
            This month
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setParams({ month: addMonths(month, -1) })} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-36 text-center text-sm font-medium">{monthLabel}</span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => setParams({ month: addMonths(month, 1) })} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setProjectsOpen(true)}>
          <FolderKanban className="size-3.5" /> Projects
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={exportPlans} disabled={allPlans.length === 0}>
          <Download className="size-3.5" /> Export
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => fileInput.current?.click()}>
          <Upload className="size-3.5" /> Import
        </Button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImportFile(e.target.files)} />
      </div>

      {projectErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            Gira can&apos;t read GitHub Projects yet, so features are missing. Sign out and in again to give it access.
          </span>
        </div>
      )}

      <PlanFinish month={month} items={toFinish} ctx={projectCtx} onFinish={(key) => addFeature(key, month)} />

      <PlanProjects
        open={projectsOpen}
        onOpenChange={setProjectsOpen}
        projects={projects}
        trackedRepos={trackedRepos}
        ctx={projectCtx}
        onPlan={addFeature}
        onUnplan={(key, m) => changeFeatures(m, (base) => base.features.filter((k) => k !== key))}
        onOpenMonth={(m) => {
          setProjectsOpen(false);
          setParams({ month: m });
        }}
      />

      {plansQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !draft ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center">
          <p className="text-sm text-muted-foreground">
            No plan for {person || "anyone"} in {monthLabel} yet.
            {previousPlan && ` It starts with the hours and split of ${formatMonth(previousPlan.month)}.`}
          </p>
          <Button size="sm" disabled={!person} onClick={() => planMonth(month, [person])}>
            Plan {monthLabel}
            {toPlan.length > 1 && ` for ${toPlan.join(" and ")}`}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4 rounded-lg border p-4">
            <Input
              value={draftMonth?.focus ?? ""}
              onChange={(e) => editMonth({ focus: e.target.value })}
              placeholder={`Focus for ${monthLabel}, in one sentence`}
              className="h-9 text-base font-medium"
            />
            <div className="space-y-1">
              <PlanFeatures
                month={month}
                selected={features}
                projects={projects}
                sizes={projectSizes}
                onChange={(next) => editMonth({ features: next })}
                onAdd={(key) => editMonth({ features: withFeature(draftMonth ?? newPlanMonth(month), key, allMonths) })}
              />
              <p className="text-xs text-muted-foreground">
                Focus and features are {monthLabel}&apos;s, for everyone planned in it
                {team.length > 1 ? ` (${team.join(", ")})` : ""}: each person&apos;s feature lane fills with the tickets assigned to them.
              </p>
            </div>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">{person}&apos;s month</p>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <div className="flex items-end gap-2">
                <NumberBox label="Hours" value={draft.regularHours} onChange={(regularHours) => edit({ regularHours })} />
                <span className="pb-1.5 text-muted-foreground">+</span>
                <NumberBox label="Investment hours" value={draft.investmentHours} onChange={(investmentHours) => edit({ investmentHours })} />
                <span className="pb-1.5 text-muted-foreground">=</span>
                <span className="pb-1.5 text-lg font-semibold tabular-nums">
                  {formatHours(draft.regularHours + draft.investmentHours)}
                </span>
              </div>
              <div className="flex items-end gap-2">
                <NumberBox label="Feature" value={draft.split.feature} step={5} suffix="%" onChange={(feature) => edit({ split: { ...draft.split, feature } })} />
                <NumberBox label="Maintenance" value={draft.split.maintenance} step={5} suffix="%" onChange={(maintenance) => edit({ split: { ...draft.split, maintenance } })} />
                <NumberBox label="Ad hoc" value={draft.split.adhoc} step={5} suffix="%" onChange={(adhoc) => edit({ split: { ...draft.split, adhoc } })} />
                {splitTotal !== 100 && (
                  <span className="pb-1.5 text-xs font-medium text-destructive">adds up to {splitTotal}%</span>
                )}
              </div>
              <div className="flex items-end gap-2">
                <NumberBox label="Low effort" value={draft.effortHours.low} suffix="h" onChange={(low) => edit({ effortHours: { ...draft.effortHours, low } })} />
                <NumberBox label="Medium" value={draft.effortHours.medium} suffix="h" onChange={(medium) => edit({ effortHours: { ...draft.effortHours, medium } })} />
                <NumberBox label="High" value={draft.effortHours.high} suffix="h" onChange={(high) => edit({ effortHours: { ...draft.effortHours, high } })} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {savePlans.isPending
                  ? "Saving…"
                  : `Plan of ${formatInstantWithTime(stored?.updatedAt ?? draft.updatedAt)}`}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-destructive"
                onClick={() => {
                  if (!confirm(`Delete ${person}'s plan for ${monthLabel}? The month's features stay for the others.`)) return;
                  discardPending();
                  setLocalPlan(null);
                  deletePlan.mutate({ person, month });
                }}
              >
                <Trash2 className="size-3" /> Delete {person}&apos;s plan
              </button>
            </div>
          </div>

          {openLoading || !forecast ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {draft.agreed ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Agreed {formatInstantWithTime(draft.agreed.at)}: {draft.agreed.tickets.length} tickets.
                    Feature and maintenance count only these; ad hoc counts as it comes.
                  </span>
                ) : forecast.past ? (
                  <span className="text-muted-foreground">No list was agreed for {monthLabel}.</span>
                ) : (
                  <span className="text-muted-foreground">
                    Not agreed yet: a forecast of open work.
                    {month > currentMonth && " It starts where the months before it end."}
                  </span>
                )}
                {!forecast.past && (
                  <Button
                    size="sm"
                    variant={draft.agreed ? "outline" : "default"}
                    className="h-7 text-xs"
                    onClick={() => {
                      if (draft.agreed && !confirm(`Replace the agreed list with what fits in ${monthLabel} now? Agreed tickets that are done stay in.`)) return;
                      agree();
                    }}
                  >
                    {draft.agreed ? "Update agreement" : `Agree ${monthLabel}`}
                  </Button>
                )}
                {draft.agreed && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (!confirm(`Undo the agreement for ${monthLabel}? It goes back to a forecast.`)) return;
                      edit({ agreed: null });
                      flush();
                    }}
                  >
                    Undo
                  </button>
                )}
              </div>
              {agreedChanged && (
                <p className="text-xs text-amber-600">
                  Hours, split, estimates or features changed since this was agreed. Update the agreement to apply them.
                </p>
              )}
              {forecast.missing > 0 && (
                <p className="text-xs text-amber-600">
                  {forecast.missing} agreed ticket{forecast.missing === 1 ? " is" : "s are"} no longer found (moved, deleted, or in a repo Gira doesn&apos;t track).
                </p>
              )}
              {!(forecast.past && !draft.agreed) && (
                <>
                  <PlanLanes forecast={forecast} selected={lane} onSelect={setLane} />
                  <PlanTable lane={forecast[lane]} laneId={lane} monthLabel={monthLabel} person={person} earlier={forecast.earlier} />
                  {forecast.unassigned.length > 0 && lane === "feature" && !forecast.past && (
                    <p className="text-xs text-amber-600">
                      No assignee, so in no one&apos;s month:{" "}
                      <TicketLinks issues={forecast.unassigned.map((issue) => ({ issue, note: issue.effort ?? undefined }))} />.
                      Assign {forecast.unassigned.length === 1 ? "it" : "them"} in GitHub to plan {forecast.unassigned.length === 1 ? "it" : "them"}.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

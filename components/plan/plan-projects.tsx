import { useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatMonth } from "@/lib/format-date";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { EPIC_ISSUE_TYPE } from "@/lib/work-kind";
import { addMonths, formatHours } from "@/lib/month-plan";
import {
  epicAction,
  forecastPlans,
  monthLoads,
  placeProject,
  previewPlanning,
  summarizeProject,
  type PlanContext,
  type PlanForecasts,
  type ProjectSummary,
} from "@/lib/project-plan";
import type { FeatureProject } from "@/lib/github/projects";
import { cn } from "@/lib/utils";
import { LeftWork, TicketLinks, previewSentence } from "./plan-finish";

/** How many months the overview looks ahead, this one included. */
const LOAD_MONTHS = 6;
const PLAN_MONTHS = 12;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Each person's feature hours per month: how much room a Project would find there. */
function MonthLoads({ ctx, forecasts, onOpenMonth }: { ctx: PlanContext; forecasts: PlanForecasts; onOpenMonth: (month: string) => void }) {
  const loads = useMemo(
    () => monthLoads(Array.from({ length: LOAD_MONTHS }, (_, i) => addMonths(ctx.currentMonth, i)), forecasts),
    [ctx.currentMonth, forecasts]
  );
  const team = forecasts.team;
  if (team.length === 0) return null;
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-medium">Feature hours per month</h3>
        <p className="text-xs text-muted-foreground">
          In red, planned work that doesn&apos;t fit under the month&apos;s line; hover for the tickets. Plan its Project in
          the month after to finish it there.
        </p>
      </div>
      <div className="grid gap-x-4 gap-y-1.5 text-xs" style={{ gridTemplateColumns: `8rem repeat(${team.length}, minmax(0, 1fr))` }}>
        <span />
        {team.map((p) => (
          <span key={p} className="truncate text-muted-foreground">{p}</span>
        ))}
        {loads.map((load) => (
          <div key={load.month} className="contents">
            <button type="button" className="text-left font-medium hover:underline" onClick={() => onOpenMonth(load.month)}>
              {formatMonth(load.month)}
            </button>
            {load.people.map((p) =>
              !p.hasPlan ? (
                <span key={p.person} className="text-muted-foreground">no plan</span>
              ) : (
                <div key={p.person} className="flex flex-col gap-0.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full", p.used > p.budget + 0.01 || p.over > 0 ? "bg-destructive/70" : "bg-[#7057ff]/70")}
                      style={{ width: `${Math.min(100, pct(p.used, p.budget))}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {formatHours(p.used)} of {formatHours(p.budget)}
                    {p.over > 0 && (
                      <span
                        className="cursor-help text-destructive"
                        title={p.overTickets.map((t) => `${t.label}${t.feature ? ` (${t.feature})` : ""}: ${formatHours(t.hours)}`).join("\n")}
                      >
                        {" "}· {formatHours(p.over)} doesn&apos;t fit
                      </span>
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function effortLine(s: ProjectSummary): string {
  const parts = [`${s.openTickets} open`, `${s.doneTickets} done`];
  if (s.averageEffort) {
    parts.push(`mostly ${s.averageEffort} (${s.efforts.low} low · ${s.efforts.medium} medium · ${s.efforts.high} high)`);
  }
  if (s.unsized) parts.push(`${s.unsized} without effort`);
  if (s.untracked) parts.push(`${s.untracked} in repos Gira doesn't track`);
  return parts.join(" · ");
}

/**
 * The Project's epic, to read for its context, and the one click that brings
 * its status in line with its tickets. Without an epic, the item most others
 * here have as their parent is offered as one.
 */
function EpicLine({ summary }: { summary: ProjectSummary }) {
  const update = useUpdateIssue();
  const { epic, epicSuggestion } = summary;

  if (epic) {
    const action = epicAction(epic);
    const { owner, repo, number } = epic.item;
    const labels = (epic.issue?.labels ?? []).map((l) => l.name);
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="rounded border border-[#7057ff]/40 px-1 text-[10px] font-medium uppercase tracking-wide text-[#7057ff]">
          Epic
        </span>
        <a href={epic.url} target="_blank" rel="noopener noreferrer" className="min-w-0 max-w-full truncate hover:underline" title={epic.issue?.title}>
          {repo}#{number}
          {epic.issue && <span className="text-muted-foreground"> · {epic.issue.title}</span>}
        </a>
        {epic.status && <span className="text-muted-foreground">({epic.status})</span>}
        {action === "start" && (
          <>
            <span className="text-amber-600">Still to do, but its tickets have started.</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ owner, repo, number, updates: { labels: [...labels.filter((l) => !l.startsWith("status: ")), "status: doing"] } })
              }
            >
              Set in progress
            </Button>
          </>
        )}
        {action === "close" && (
          <>
            <span className="text-emerald-600">Every ticket is done.</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              disabled={update.isPending}
              onClick={() => update.mutate({ owner, repo, number, updates: { state: "closed" } })}
            >
              Close the epic
            </Button>
          </>
        )}
      </div>
    );
  }

  if (!epicSuggestion) return null;
  const { owner, repo, number } = epicSuggestion.item;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        No epic yet:{" "}
        <a href={`https://github.com/${owner}/${repo}/issues/${number}`} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:underline" title={epicSuggestion.issue?.title}>
          {repo}#{number}
        </a>{" "}
        is the parent of {epicSuggestion.children} tickets here.
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-xs"
        disabled={update.isPending}
        onClick={() => update.mutate({ owner, repo, number, updates: { type: EPIC_ISSUE_TYPE } })}
      >
        Mark as the epic
      </Button>
    </div>
  );
}

function ProjectCard({
  summary,
  ctx,
  forecasts,
  onPlan,
  onUnplan,
}: {
  summary: ProjectSummary;
  ctx: PlanContext;
  forecasts: PlanForecasts;
  onPlan: (key: string, month: string) => void;
  onUnplan: (key: string, month: string) => void;
}) {
  const [target, setTarget] = useState<string>("");
  const placed = useMemo(() => placeProject(summary, ctx, forecasts), [summary, ctx, forecasts]);
  const started = summary.months.length > 0;
  const toFinish = started && placed.left.some((t) => t.inTeam);
  // Where its left work would go: offered at once, with what it would do there.
  const finish = useMemo(
    () => (toFinish ? previewPlanning(summary, placed.finishIn, ctx) : null),
    [toFinish, summary, placed.finishIn, ctx]
  );
  const preview = useMemo(() => (target ? previewPlanning(summary, target, ctx) : null), [summary, target, ctx]);
  const options = Array.from({ length: PLAN_MONTHS }, (_, i) => addMonths(ctx.currentMonth, i)).filter(
    (m) => !summary.months.includes(m)
  );
  const pastMonths = summary.months.filter((m) => m < ctx.currentMonth);
  const missingPlans = placed.placements.flatMap((p) => p.people.filter((x) => !x.hasPlan).map((x) => `${x.person} in ${formatMonth(p.month)}`));
  const unsizedAssigned = summary.openIssues.filter((i) => !i.effort && i.assignees.length > 0);
  // Sized only: those count in the hours left. An unassigned ticket without an
  // effort is often a tracking issue, and already counts as "without effort".
  const unassignedSized = summary.unassigned.issues.filter((i) => i.effort);

  return (
    <div className={cn("space-y-2 rounded-lg border p-3", summary.openTickets === 0 && "opacity-60")}>
      <div className="flex items-baseline justify-between gap-3">
        <a href={summary.project.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 font-medium hover:underline">
          <span className="truncate">{summary.project.title}</span>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
        </a>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {summary.openTickets === 0 ? "done" : `${formatHours(summary.hours)} left`}
        </span>
      </div>
      <EpicLine summary={summary} />
      <p className="text-xs text-muted-foreground">{effortLine(summary)}</p>
      {(summary.people.length > 0 || summary.unassigned.tickets > 0) && (
        <p className="flex flex-wrap gap-x-3 text-xs tabular-nums">
          {summary.people.map((p) => (
            <span key={p.person}>
              {p.person} <span className="font-medium">{formatHours(p.hours)}</span>
              {p.unsized > 0 && <span className="text-amber-600"> +{p.unsized} unsized</span>}
            </span>
          ))}
          {summary.unassigned.hours > 0 && (
            <span className="text-muted-foreground">unassigned {formatHours(summary.unassigned.hours)}</span>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {!started && <span className="text-muted-foreground">Not planned in any month</span>}
        {pastMonths.map((m) => (
          <span key={m} className="rounded border px-1.5 py-0.5 text-muted-foreground">{formatMonth(m)}</span>
        ))}
        {placed.placements.map((p) => (
          <span
            key={p.month}
            className={cn(
              "inline-flex items-center gap-1 rounded border py-0.5 pl-1.5 pr-0.5",
              p.hours > 0 ? "border-[#7057ff]/40 bg-[#7057ff]/5" : "border-dashed text-muted-foreground"
            )}
            title={p.hours > 0 ? undefined : `Nothing of it is left for ${formatMonth(p.month)}: the months before take all its assigned work.`}
          >
            {formatMonth(p.month)} · <span className="tabular-nums">{p.hours > 0 ? formatHours(p.hours) : "nothing left"}</span>
            <button type="button" onClick={() => onUnplan(summary.key, p.month)} className="rounded p-0.5 hover:bg-background" aria-label={`Take out of ${formatMonth(p.month)}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      {toFinish && (
        <div className="space-y-1 rounded-md bg-amber-500/5 p-2 text-xs">
          <p className="text-amber-700 dark:text-amber-500">
            <LeftWork forecast={placed} currentMonth={ctx.currentMonth} />
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Button size="sm" className="h-7 text-xs" onClick={() => onPlan(summary.key, placed.finishIn)}>
              Finish in {formatMonth(placed.finishIn)}
            </Button>
            {finish && <span className="min-w-0 flex-1 text-muted-foreground">{previewSentence(finish, placed.finishIn, summary)}</span>}
          </div>
        </div>
      )}
      {unassignedSized.length > 0 && (
        <p className="text-xs text-amber-600">
          {formatHours(summary.unassigned.hours)} has no assignee, so no one&apos;s month takes it:{" "}
          <TicketLinks issues={unassignedSized.map((issue) => ({ issue, note: issue.effort ?? undefined }))} />. Assign{" "}
          {unassignedSized.length === 1 ? "it" : "them"} in GitHub to plan {unassignedSized.length === 1 ? "it" : "them"}.
        </p>
      )}
      {unsizedAssigned.length > 0 && started && (
        <p className="text-xs text-amber-600">
          No effort, so no hours: <TicketLinks issues={unsizedAssigned.map((issue) => ({ issue }))} />. Give{" "}
          {unsizedAssigned.length === 1 ? "it" : "them"} an effort to place {unsizedAssigned.length === 1 ? "it" : "them"}.
        </p>
      )}
      {missingPlans.length > 0 && (
        <p className="text-xs text-amber-600">No plan for {missingPlans.join(", ")}: their part isn&apos;t counted.</p>
      )}

      {summary.openTickets > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="h-7 w-44 text-xs" aria-label="Plan in month">
              <SelectValue placeholder="Plan in a month…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((m) => (
                <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {target && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  onPlan(summary.key, target);
                  setTarget("");
                }}
              >
                Add to {formatMonth(target)}
              </Button>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setTarget("")}>
                Cancel
              </button>
            </>
          )}
          {preview && <p className="w-full text-xs">{previewSentence(preview, target, summary)}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * Every open feature Project from above: what is left, whose hours it needs,
 * which months it is planned in, and room to plan it somewhere. Planning here
 * changes the same shared month list the month view edits.
 */
export function PlanProjects({
  open,
  onOpenChange,
  projects,
  trackedRepos,
  ctx,
  onPlan,
  onUnplan,
  onOpenMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: FeatureProject[];
  trackedRepos: Set<string>;
  ctx: PlanContext;
  onPlan: (key: string, month: string) => void;
  onUnplan: (key: string, month: string) => void;
  onOpenMonth: (month: string) => void;
}) {
  const forecasts = useMemo(() => (open ? forecastPlans(ctx) : null), [open, ctx]);
  const summaries = useMemo(() => {
    if (!open) return [];
    const all = projects.map((p) => summarizeProject(p, ctx, trackedRepos));
    const next = (s: ProjectSummary) => s.months.find((m) => m >= ctx.currentMonth) ?? "9999-99";
    // Planned first, earliest month first; then the rest, biggest first; done last.
    return all.sort(
      (a, b) =>
        Number(a.openTickets === 0) - Number(b.openTickets === 0) ||
        next(a).localeCompare(next(b)) ||
        b.hours - a.hours ||
        a.project.title.localeCompare(b.project.title)
    );
  }, [open, projects, ctx, trackedRepos]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:w-[640px] sm:max-w-[50vw]">
        <SheetHeader className="pb-0">
          <SheetTitle>Projects</SheetTitle>
          <SheetDescription>
            Every open feature Project: what&apos;s left, whose hours it needs, and where it&apos;s planned. A month&apos;s
            features are shared, so planning one fills each person&apos;s month with their own tickets.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-6">
          {forecasts && <MonthLoads ctx={ctx} forecasts={forecasts} onOpenMonth={onOpenMonth} />}
          <section className="space-y-2">
            {forecasts &&
              summaries.map((s) => (
                <ProjectCard key={s.key} summary={s} ctx={ctx} forecasts={forecasts} onPlan={onPlan} onUnplan={onUnplan} />
              ))}
            {open && summaries.length === 0 && (
              <p className="text-sm text-muted-foreground">No open Projects found.</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

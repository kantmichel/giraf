import { useMemo } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/format-date";
import { formatHours } from "@/lib/month-plan";
import {
  previewPlanning,
  type LeftTicket,
  type PlanContext,
  type PlanningPreview,
  type ProjectForecast,
  type ProjectSummary,
} from "@/lib/project-plan";
import type { ScoredIssue } from "@/lib/wsjf";

/**
 * What is left of a Project and what planning it somewhere would do, in the
 * words both the Projects overview and the month's "Finish first" banner use.
 */

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function joinAnd(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Tickets as links, "pulse-wallet#24", the first few and a count. */
export function TicketLinks({ issues, max = 3 }: { issues: { issue: ScoredIssue; note?: string }[]; max?: number }) {
  const shown = issues.slice(0, max);
  return (
    <>
      {shown.map(({ issue, note }, i) => (
        <span key={`${issue.repo.fullName}#${issue.number}`}>
          {i > 0 && (i === shown.length - 1 && issues.length <= max ? " and " : ", ")}
          <a
            href={issue.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={issue.title}
            className="font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {issue.repo.name}#{issue.number}
          </a>
          {note && <span className="text-muted-foreground"> ({note})</span>}
        </span>
      ))}
      {issues.length > max && ` and ${issues.length - max} more`}
    </>
  );
}

function reasonOf(t: LeftTicket, forecast: ProjectForecast, currentMonth: string): string {
  if (!t.inTeam) return `${t.person} has no plans in Gira`;
  if (t.outOf) return t.outOf.agreed ? `isn't in ${formatMonth(t.outOf.month)}'s agreed list` : `doesn't fit in ${formatMonth(t.outOf.month)}`;
  if (forecast.lastMonth && forecast.lastMonth < currentMonth) return `was planned up to ${formatMonth(forecast.lastMonth)}`;
  return `${t.person} has no plan in its months`;
}

/** "4 h left after December: pulse-wallet#24 doesn't fit in December." */
export function LeftWork({ forecast, currentMonth }: { forecast: ProjectForecast; currentMonth: string }) {
  if (forecast.left.length === 0) return null;
  const groups = new Map<string, LeftTicket[]>();
  for (const t of forecast.left) {
    const reason = reasonOf(t, forecast, currentMonth);
    groups.set(reason, [...(groups.get(reason) ?? []), t]);
  }
  return (
    <span>
      <span className="font-medium">
        {formatHours(forecast.leftHours)} left{forecast.lastMonth ? ` after ${formatMonth(forecast.lastMonth)}` : ""}
      </span>
      :{" "}
      {Array.from(groups, ([reason, tickets], i) => (
        <span key={reason}>
          {i > 0 && "; "}
          <TicketLinks issues={tickets.map((t) => ({ issue: t.issue, note: `${t.person}, ${formatHours(t.hours)}` }))} />{" "}
          {reason}
        </span>
      ))}
      .
    </span>
  );
}

/** "5 h of 23 h fits in December (22%); 18 h (78%) runs on past it." */
export function previewSentence(preview: PlanningPreview, month: string, summary: ProjectSummary): string {
  const m = formatMonth(month);
  const left = preview.inMonth + preview.after;
  let text: string;
  if (left < 0.01) {
    text = `Nothing of it is left for ${m}: the months before it take all its assigned work.`;
  } else {
    text =
      (preview.before > 0.01 ? `${formatHours(preview.before)} lands before ${m}. ` : "") +
      (preview.after < 0.01
        ? `All ${formatHours(left)} left fits in ${m}.`
        : `${formatHours(preview.inMonth)} of ${formatHours(left)} fits in ${m} (${pct(preview.inMonth, left)}%); ` +
          `${formatHours(preview.after)} (${100 - pct(preview.inMonth, left)}%) runs on past it.`);
  }
  if (preview.pushed.length) {
    text += ` It pushes ${joinAnd(preview.pushed.map((p) => `${formatHours(p.hours)} of ${p.title}`))} below ${m}'s line.`;
  }
  if (summary.unassigned.hours > 0) {
    text += ` ${formatHours(summary.unassigned.hours)} has no assignee, so it isn't counted.`;
  }
  const noPlan = preview.forecast.placements
    .find((p) => p.month === month)
    ?.people.filter((p) => !p.hasPlan)
    .map((p) => p.person);
  if (noPlan?.length) text += ` ${joinAnd(noPlan)} has no plan in Gira, so their part isn't counted.`;
  return text;
}

/**
 * The month's "Finish first" banner: Projects started in earlier months whose
 * work runs on past them, so they can be finished here in one click before
 * anything new starts. Planning one puts it before the month's new features.
 */
export function PlanFinish({
  month,
  items,
  ctx,
  onFinish,
}: {
  month: string;
  items: { summary: ProjectSummary; forecast: ProjectForecast }[];
  ctx: PlanContext;
  onFinish: (key: string) => void;
}) {
  const previews = useMemo(
    () => new Map(items.map(({ summary }) => [summary.key, previewPlanning(summary, month, ctx)])),
    [items, month, ctx]
  );
  if (items.length === 0) return null;
  const m = formatMonth(month);
  return (
    <div className="space-y-2 rounded-lg border border-[#7057ff]/40 bg-[#7057ff]/5 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <Flag className="size-4 text-[#7057ff]" />
        Finish first: {items.length === 1 ? "a Project" : `${items.length} Projects`} started before {m} with work left
      </p>
      <ul className="space-y-2">
        {items.map(({ summary, forecast }) => {
          const preview = previews.get(summary.key);
          return (
            <li key={summary.key} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="min-w-0 flex-1 space-y-0.5 text-xs">
                <p>
                  <a href={summary.project.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                    {summary.project.title}
                  </a>
                  {" · "}
                  <LeftWork forecast={forecast} currentMonth={ctx.currentMonth} />
                </p>
                {preview && <p className="text-muted-foreground">{previewSentence(preview, month, summary)}</p>}
              </div>
              <Button size="sm" className="h-7 shrink-0 text-xs" onClick={() => onFinish(summary.key)}>
                Finish in {m}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        It goes before {m}&apos;s new features, so a started Project is finished before the next one starts.
      </p>
    </div>
  );
}

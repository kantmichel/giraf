import type { NormalizedIssue } from "@/types/github";

// Priority uses an exponential-ish scale so `critical` outranks lower priorities
// even when its effort is high. With effort max of 3, critical=10 guarantees
// critical+high (3.33) > high+low (3.0) — critical is always a top contender.
const PRIORITY_VALUE: Record<NonNullable<NormalizedIssue["priority"]>, number> = {
  critical: 10,
  high: 3,
  medium: 2,
  low: 1,
};

const EFFORT_COST: Record<NonNullable<NormalizedIssue["effort"]>, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Multiplier applied per `impact: <type>` label. Stacks multiplicatively. */
export const IMPACT_BOOST_PER_LABEL = 1.5;
/** Cap on total boost so many impact labels can't push something past critical work. */
export const IMPACT_BOOST_CAP = 3;

/**
 * Multiplier applied to base WSJF score for a list of impacts.
 * 0 impacts → 1.0, 1 → 1.5, 2 → 2.25, capped at IMPACT_BOOST_CAP (3.0).
 */
export function computeImpactMultiplier(impacts: string[]): number {
  if (!impacts || impacts.length === 0) return 1;
  const raw = Math.pow(IMPACT_BOOST_PER_LABEL, impacts.length);
  return Math.min(raw, IMPACT_BOOST_CAP);
}

/** Ceiling on the due-date multiplier. Capped so one forgotten overdue ticket
 *  can't pin itself to the top of the board forever. */
export const DUE_BOOST_MAX = 4;

/**
 * How many days before the due date a ticket starts climbing, by effort.
 *
 * Scaled by effort rather than fixed, because the question is not "when is this
 * due" but "when must someone start". A day of work due in a week is not yet
 * urgent; three weeks of work due in a week already is.
 */
const DUE_LEAD_DAYS: Record<NonNullable<NormalizedIssue["effort"]>, number> = {
  low: 5,
  medium: 12,
  high: 25,
};
/** Used when effort is unset — mid-range, so an untriaged ticket with a date
 *  still surfaces rather than staying invisible until the day itself. */
const DUE_LEAD_DAYS_DEFAULT = 7;

const MS_PER_DAY = 86_400_000;

/**
 * Multiplier from an approaching due date: 1.0 outside the lead window, rising
 * smoothly to DUE_BOOST_MAX on the due date, then held there once overdue.
 */
export function computeDueMultiplier(
  dueDate: string | null,
  effort: NormalizedIssue["effort"],
  now: Date = new Date()
): number {
  if (!dueDate) return 1;
  const due = new Date(`${dueDate}T00:00:00Z`);
  if (isNaN(due.getTime())) return 1;

  const lead = effort ? DUE_LEAD_DAYS[effort] : DUE_LEAD_DAYS_DEFAULT;
  const daysUntilDue = (due.getTime() - now.getTime()) / MS_PER_DAY;
  if (daysUntilDue >= lead) return 1;

  const progress = Math.min(1, (lead - daysUntilDue) / lead);
  return 1 + (DUE_BOOST_MAX - 1) * progress;
}

/** Whole days until the due date; negative once overdue. Null without a date. */
export function daysUntilDue(
  dueDate: string | null,
  now: Date = new Date()
): number | null {
  if (!dueDate) return null;
  const due = new Date(`${dueDate}T00:00:00Z`);
  if (isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * WSJF (Weighted Shortest Job First) score:
 * (priority ÷ effort) × impact multiplier × due-date multiplier.
 * Returns null when either priority or effort is unset.
 *
 * Base range: 0.33 (low + high effort) to 10.0 (critical + low effort).
 * Critical priority is weighted so even critical+high-effort (3.33) beats high+low-effort (3.0).
 * With impacts, score is multiplied by 1.5^N (capped at 3×).
 */
export function computeWsjf(
  priority: NormalizedIssue["priority"],
  effort: NormalizedIssue["effort"],
  impacts: string[] = [],
  dueDate: string | null = null,
  now: Date = new Date(),
): number | null {
  if (!priority || !effort) return null;
  const base = PRIORITY_VALUE[priority] / EFFORT_COST[effort];
  return (
    base * computeImpactMultiplier(impacts) * computeDueMultiplier(dueDate, effort, now)
  );
}

/** Stable cross-repo identity for an issue, e.g. "flipstream-io/pulse-admin#91". */
export function issueKey(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}#${number}`;
}

/** Margin by which a blocker is lifted above what it blocks. Large enough to
 *  survive the two-decimal display, small enough not to distort the scale. */
const LIFT_MARGIN = 0.01;

export interface EffectiveWsjf {
  /** Score after inheriting from blocked issues; null only when unscored and
   *  blocking nothing. */
  score: number | null;
  /** Own score before any lift, for explaining the difference. */
  ownScore: number | null;
  /** Keys of issues this one blocks that caused the lift. Empty when unlifted. */
  liftedBy: string[];
  /** Due-date multiplier already folded into the scores above; 1 when the date
   *  is absent or still outside its lead window. */
  dueMultiplier: number;
}

/**
 * Effective WSJF for a whole issue set, where a blocker always outranks what it
 * blocks. A blocker inherits the highest score among its dependents plus a
 * margin, so ordering holds in any score-sorted view without a bespoke sort.
 *
 * An untriaged blocker still gets lifted: something gating scored work has to
 * surface even when nobody has given it a priority yet.
 *
 * Dependency cycles are broken by falling back to the issue's own score, so a
 * mis-entered loop degrades to today's behaviour instead of hanging.
 */
export function computeEffectiveWsjf(
  issues: NormalizedIssue[],
  now: Date = new Date()
): Map<string, EffectiveWsjf> {
  const keyOf = (i: NormalizedIssue) =>
    issueKey(i.repo.owner, i.repo.name, i.number);

  const ownScores = new Map<string, number | null>();
  const dueMultipliers = new Map<string, number>();
  // Reverse of `blockedBy`: blocker key -> keys of issues waiting on it.
  const blocks = new Map<string, string[]>();

  for (const issue of issues) {
    const key = keyOf(issue);
    ownScores.set(
      key,
      computeWsjf(issue.priority, issue.effort, issue.impacts, issue.dueDate, now)
    );
    dueMultipliers.set(key, computeDueMultiplier(issue.dueDate, issue.effort, now));
    for (const dep of issue.blockedBy) {
      const blockerKey = issueKey(dep.owner, dep.repo, dep.number);
      if (!blocks.has(blockerKey)) blocks.set(blockerKey, []);
      blocks.get(blockerKey)!.push(key);
    }
  }

  const resolved = new Map<string, EffectiveWsjf>();
  const visiting = new Set<string>();

  function resolve(key: string): EffectiveWsjf {
    const cached = resolved.get(key);
    if (cached) return cached;

    const ownScore = ownScores.get(key) ?? null;
    const dueMultiplier = dueMultipliers.get(key) ?? 1;
    if (visiting.has(key))
      return { score: ownScore, ownScore, liftedBy: [], dueMultiplier };

    visiting.add(key);
    let score = ownScore;
    const liftedBy: string[] = [];

    for (const blockedKey of blocks.get(key) ?? []) {
      // A blocker for an issue outside the current set can't be ranked against
      // it, so skip rather than invent a score.
      if (!ownScores.has(blockedKey)) continue;
      const blocked = resolve(blockedKey);
      if (blocked.score === null) continue;
      const needed = blocked.score + LIFT_MARGIN;
      if (score === null || needed > score) {
        score = needed;
        liftedBy.length = 0;
        liftedBy.push(blockedKey);
      } else if (needed === score && !liftedBy.includes(blockedKey)) {
        liftedBy.push(blockedKey);
      }
    }

    visiting.delete(key);
    const result: EffectiveWsjf = { score, ownScore, liftedBy, dueMultiplier };
    resolved.set(key, result);
    return result;
  }

  for (const key of ownScores.keys()) resolve(key);
  return resolved;
}

/** Drop the owner for display: "flipstream-io/pulse-admin#93" → "pulse-admin#93". */
export function shortKey(key: string): string {
  return key.slice(key.indexOf("/") + 1);
}

/** An issue carrying its dependency-aware score. */
export type ScoredIssue = NormalizedIssue & { wsjf: EffectiveWsjf };

/**
 * Prepare issues for display: attach effective scores, and fill in each
 * blocker's status from the issues already loaded rather than asking GitHub
 * for it (see the note on query cost in lib/github/dependencies.ts).
 *
 * Always run over the full loaded set rather than a filtered view: a blocker
 * hidden by the current filters still has to lift correctly against the rows
 * that remain.
 */
export function attachEffectiveWsjf(
  issues: NormalizedIssue[],
  now: Date = new Date()
): ScoredIssue[] {
  const scores = computeEffectiveWsjf(issues, now);
  const statusByKey = new Map(
    issues.map((i) => [issueKey(i.repo.owner, i.repo.name, i.number), i.status])
  );

  return issues.map((issue) => {
    const key = issueKey(issue.repo.owner, issue.repo.name, issue.number);
    return {
      ...issue,
      // A blocker in an untracked repo stays unresolved, and renders on its
      // open/closed state alone.
      blockedBy: issue.blockedBy.map((dep) => ({
        ...dep,
        status:
          statusByKey.get(issueKey(dep.owner, dep.repo, dep.number)) ?? dep.status,
      })),
      wsjf: scores.get(key)!,
    };
  });
}

/** Format a WSJF score for display, e.g. 1.5 → "1.5", null → "—". */
export function formatWsjf(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(score % 1 === 0 ? 1 : 2);
}

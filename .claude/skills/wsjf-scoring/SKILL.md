---
name: wsjf-scoring
description: How Giraf ranks issues — the WSJF formula and every input that feeds it (priority, effort, impact labels, due dates, blocked-by dependencies). Read this before changing lib/wsjf.ts, adding a scoring input, explaining why an issue sits where it does on the board, or answering "why is this ranked above that".
---

# WSJF scoring in Giraf

Giraf orders work by a WSJF (Weighted Shortest Job First) score. The board's
default sort is this number descending, so anything that changes it changes what
people work on next.

## The formula

```
base       = PRIORITY_VALUE[priority] / EFFORT_COST[effort]
own score  = base x impact multiplier x due multiplier
effective  = max(own score, highest score of anything this issue blocks + 0.01)
```

`computeWsjf` produces the own score; `computeEffectiveWsjf` applies the
dependency lift across the whole set. All of it lives in `lib/wsjf.ts`.

An issue with no `priority:` or no `effort:` label scores `null` and sorts to the
bottom, regardless of sort direction. The one exception is a blocker — see
**Dependency lift** below.

## Inputs

Everything comes from GitHub. Giraf stores no scoring state of its own, so the
labels on the issue are the whole truth.

### Priority — `priority: critical | high | medium | low`

| Value | Weight |
| --- | --- |
| critical | 10 |
| high | 3 |
| medium | 2 |
| low | 1 |

Critical is deliberately far above `high`, not one step above. With effort capped
at 3, a weight of 10 guarantees that critical + high-effort (3.33) still beats
high + low-effort (3.0) — so a critical bug with a messy fix can never rank below
a quick nice-to-have. This is why the scale is not 4/3/2/1.

### Effort — `effort: low | medium | high`

| Value | Cost |
| --- | --- |
| low | 1 |
| medium | 2 |
| high | 3 |

Effort divides, so cheap work floats up. Base range is 0.33 (low + high effort)
to 10.0 (critical + low effort).

### Impact — `impact: <type>`, e.g. `impact: customer`

Multiplies by 1.5 per label, compounding, capped at 3x total. Two labels give
2.25x, three would give 3.375x but are clamped to 3x. The cap exists so that
piling on labels cannot outrun genuinely critical work.

### Due date — `due: YYYY-MM-DD`

Multiplies by 1.0 up to 4.0 as the date approaches. A malformed date (including
impossible ones like `2026-02-31`) is ignored rather than guessed at, so a typo
reads as "no due date" instead of silently scheduling work on the wrong day.

The ramp is **scaled by effort**, because the real question is not "when is this
due" but "when must someone start":

| Effort | Starts climbing |
| --- | --- |
| low | 5 days before |
| medium | 12 days before |
| high | 25 days before |
| unset | 7 days before |

Outside that window the multiplier is exactly 1.0 — a dated issue is invisible
until it deserves attention. Inside it, the multiplier rises linearly to 4.0 on
the due date and is then **held at 4.0** while overdue. The cap is deliberate: an
uncapped boost would let one forgotten ticket pin itself to the top forever and
drown everything else.

### Dependency lift — GitHub's native "blocked by"

Read over GraphQL in `lib/github/dependencies.ts`, never stored locally. If A
blocks B, A's effective score becomes `max(A's own, B's effective + 0.01)`, so a
blocker always outranks what it blocks. This propagates down a chain and is what
makes the guarantee hold in any score-sorted view without a special sort.

Two deliberate behaviours:

- **An untriaged blocker still gets lifted.** Work gating scored work has to
  surface even before anyone has given it a priority, so a `null` own score can
  become a real number.
- **Cycles fall back to the issue's own score.** A mis-entered loop degrades to
  ordinary ranking rather than recursing forever.

## Worked example

A skill-doc ticket: `priority: medium`, `effort: low`, `due: 2026-10-09`, no
impact labels.

```
base = 2 / 1 = 2.0

2026-09-22  17 days out  1.00x  ->  2.0   (outside the 5-day window, stays buried)
2026-10-04   5 days out  1.23x  ->  2.45  (window opens, starts climbing)
2026-10-06   3 days out  2.42x  ->  4.85
2026-10-09        today  4.00x  ->  8.0
2026-10-13   4 days late 4.00x  ->  8.0   (held at the cap)
```

The same due date on a **high-effort** ticket starts climbing on 2026-09-14
instead, because it needs a 25-day runway. That asymmetry is the whole point of
scaling the ramp by effort.

## How the UI shows it

| Appearance | Meaning |
| --- | --- |
| Plain number | base score, no multipliers active |
| Purple with a lightning bolt | impact-boosted |
| Amber with an up-chevron | lifted by a dependency |
| Amber date in the Due column | due within 3 days |
| Red date in the Due column | overdue |

The WSJF cell's tooltip spells out which multipliers applied, including the due
date and its multiplier. When an issue is both impact-boosted and dependency-
lifted, the lift wins the styling, because it is the stronger signal — the
multiplier is already folded into the number either way.

## Changing the scoring

Every tunable is a named export or module constant at the top of `lib/wsjf.ts`:
`PRIORITY_VALUE`, `EFFORT_COST`, `IMPACT_BOOST_PER_LABEL`, `IMPACT_BOOST_CAP`,
`DUE_BOOST_MAX`, `DUE_LEAD_DAYS`, `LIFT_MARGIN`.

Before changing one, work out what it does to the **relative** order of the four
corner cases — critical+high, high+low, low+high, and anything with a due date
inside its window. The scale only works because those comparisons hold; each
constant was picked to preserve a specific one of them, and the reasons are in
the comments next to them.

There are no tests in this repo. Verify a scoring change by scripting
`computeWsjf` / `computeEffectiveWsjf` directly against the cases you care about
and reading the numbers, rather than assuming the change did what you intended.

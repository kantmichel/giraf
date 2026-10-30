# Giraf — repo rules

## One mechanism per behaviour

Before adding a component, hook, table or route, check whether something already
does that job. If it does, extend it. Two implementations of one behaviour will
drift, and the drift shows up as a bug nobody can explain.

This is not a style preference — it has already cost us:

- **Two issue detail drawers.** The issues page drove one from the URL while
  `AppShell` drove another from local state for the command palette. Opening an
  issue via ⌘K produced no shareable link, and on `/issues` both could render at
  once. Fixed by deleting the duplicate and routing every path through the URL.
- **`issue_relationships`.** A local table designed for blocked-by, sitting
  empty and unused beside GitHub's native dependencies. Dropped.
- **A watch system with no table.** `watched_issues` was referenced by code but
  absent from the database, so every call 500'd — and because notification
  detection touched it first inside a silent `catch`, it also blocked every
  closed-issue notification. Removed entirely.

When you genuinely need a second path, say why in a comment next to it.

## GitHub is the source of truth

Issue state lives in GitHub, not in SQLite. Labels carry `status:`, `priority:`,
`effort:`, `impact:` and `due:`; dependencies come from GitHub's native
blocked-by edges. Do not add a local table that mirrors something GitHub already
stores — it will drift and there is no reconciliation path.

SQLite is for things GitHub cannot hold: cached history, user preferences, and
Gira-local state such as which mentions you dismissed.

## Enrichment must never take down the page

Anything fetched to decorate the main view — PR reviewers, dependency edges,
mentions — catches its own failures and degrades to "unknown". A rate-limited
GraphQL call inside a `Promise.all` once emptied the entire board, because
`Promise.all` rejects as soon as one promise does.

## Watch the cost of GraphQL queries

GraphQL bills by requested node count and nested connections multiply. A query
asking for 100 issues × 20 blockers × 20 labels requests 40,000 nodes a page and
will exhaust the hourly budget in a handful of loads. Fetch ids and shallow
fields; resolve the rest from data already loaded.

## Dates

All UI dates go through `lib/format-date.ts` — European ordering, 24-hour clock.
Date-only values (a `due:` label) are pinned to UTC, because a calendar date has
no timezone and rendering it locally shifts it a day west of Greenwich.
Timestamps render in the viewer's zone.

## Scoring

`lib/wsjf.ts` is the only place ranking is decided. Read
`.claude/skills/wsjf-scoring/SKILL.md` before touching it — each constant was
chosen to preserve a specific comparison, and the reasons are in the comments.

## Migrations

Never edit an applied migration; add a new one. They run in **array order**, not
by version number, so a new entry goes at the end of the array. Use
`IF EXISTS` / `IF NOT EXISTS` — at least one database has diverged from what the
migration list claims.

## Verifying

There is no test suite, and CI runs lint, typecheck and build only. A change to
logic is not verified by those passing. Exercise the real code path against real
data — a short script calling the function directly — and read the output.

## Running it locally

The instance on http://localhost:3000 runs the production build, not the dev
server: `bun run build && bun run start`, in the "Gira" tab of the Herdr
"Servers" workspace. Do not put `bun dev` back in its place. Measured on
30 Oct 2026, the dev server held 2.1 GiB and grew by about 0.5 GiB a day; the
production server started at about 70 MiB.

There is no hot reload, so a change is not live until the server restarts:
Ctrl-C in that pane, then `bun run build && bun run start` again (about 10 s).
`next build` deletes `.next` (all but `cache`, `dev` and `lock`) from under the
running server, so every build — including one run only to verify a change — is
followed by that restart.

When UI work really needs hot reload, run `bun run dev -p 3002` beside it and
stop it when done. Dev output lives in `.next/dev`, which a build leaves alone,
and both servers can share `data/gira.db`: it is in WAL mode and nothing runs
on a server-side timer.

`next start` warns that it "does not work with output: standalone". It works;
the warning is expected. Do not run `node .next/standalone/server.js` without
`DATABASE_PATH`: the build copies a snapshot of `data/gira.db` into
`.next/standalone/data/`, and the server would write to that stale copy.

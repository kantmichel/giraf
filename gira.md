# Gira - product requirements spec

## Overview

**Gira** (GitHub + Jira) is a Next.js full-stack web application that aggregates GitHub issues across multiple repositories into a unified, Notion/Airtable-style interface. It serves as an opinionated issue management layer on top of GitHub, with native support for release-please versioning workflows.

**Core philosophy:** GitHub remains the source of truth. Gira is for viewing, triaging, and managing issues. All deep interaction (commenting, code review) happens on GitHub itself.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Frontend | React, shadcn/ui, Tailwind CSS |
| State management | TanStack Query (React Query) for server state |
| Data source | GitHub REST API v3 + GraphQL API v4 (live fetch) |
| Local cache | SQLite via better-sqlite3 (persistent query cache, offline-capable later) |
| Auth | NextAuth.js with GitHub OAuth provider |
| Deployment | Vercel (or self-hosted) |

---

## Authentication and authorization

### GitHub OAuth flow

1. User logs in via GitHub OAuth (NextAuth.js)
2. OAuth scopes requested: `repo`, `read:org`, `read:user`
3. Access token stored server-side in encrypted session
4. Token used for all GitHub API calls on behalf of the user

### Access model

| Role | Capabilities |
|---|---|
| Admin | Add/remove repos, invite users, manage settings, full issue management |
| Member | View issues for repos they have access to, manage labels/assignees/priority on those issues |
| Viewer (invited) | Read-only access to repos added by an admin, even if they don't have direct GitHub access (uses admin's token for fetching) |

### Multi-tenant readiness

- All data scoped by `workspace_id` (maps to a GitHub org or user account initially)
- Workspace settings stored in SQLite
- Design all API routes with workspace context from day one

---

## Data architecture

### Live fetch strategy (MVP)

All issue data fetched directly from GitHub API per request. No background sync.

### SQLite cache layer

SQLite acts as a **transparent cache**, not a primary datastore. Purpose:

1. **Query cache** - cache GitHub API responses with TTL (e.g., 60s for issue lists, 5min for release data)
2. **Custom metadata** - store app-specific data that doesn't live on GitHub (e.g., custom priority overrides, view configurations, workspace settings)
3. **User preferences** - saved filters, default views, column configurations

### SQLite schema (initial)

```sql
-- Workspace / org configuration
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  github_org TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Repos tracked by this workspace
CREATE TABLE tracked_repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, owner, repo)
);

-- API response cache
CREATE TABLE api_cache (
  cache_key TEXT PRIMARY KEY,
  response_body TEXT NOT NULL,
  etag TEXT,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- Custom priority overrides (when GitHub labels aren't enough)
CREATE TABLE issue_priority_overrides (
  workspace_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')),
  set_by TEXT NOT NULL,
  set_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workspace_id, repo_full_name, issue_number)
);

-- Saved views (user-defined filters + column configs)
CREATE TABLE saved_views (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK(view_type IN ('table', 'kanban', 'list', 'timeline')),
  config JSON NOT NULL,
  created_by TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User workspace membership
CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  github_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'member', 'viewer')),
  invited_by TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workspace_id, github_user_id)
);

-- Snoozed issues (hidden until date or new activity)
CREATE TABLE snoozed_issues (
  workspace_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  snoozed_by TEXT NOT NULL,
  snoozed_until DATETIME,              -- NULL = snooze until new activity
  wake_on_activity BOOLEAN DEFAULT TRUE,
  snoozed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(workspace_id, repo_full_name, issue_number)
);

-- Issue relationships (blocks, relates to, duplicate of)
CREATE TABLE issue_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  source_repo TEXT NOT NULL,
  source_issue INTEGER NOT NULL,
  target_repo TEXT NOT NULL,
  target_issue INTEGER NOT NULL,
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('blocks', 'blocked_by', 'relates_to', 'duplicate_of')),
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, source_repo, source_issue, target_repo, target_issue, relationship_type)
);

-- Triage state per issue (tracks whether issue has been triaged)
CREATE TABLE triage_state (
  workspace_id TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined', 'snoozed')),
  triaged_by TEXT,
  triaged_at DATETIME,
  PRIMARY KEY(workspace_id, repo_full_name, issue_number)
);
```

---

## GitHub API integration

### Endpoints used

| Data | API | Notes |
|---|---|---|
| Issues list | `GET /repos/{owner}/{repo}/issues` | Supports filtering by label, assignee, state |
| Single issue | `GET /repos/{owner}/{repo}/issues/{number}` | Full body + metadata |
| Issue comments | `GET /repos/{owner}/{repo}/issues/{number}/comments` | For the detail sidebar |
| Labels | `GET/POST/PATCH/DELETE /repos/{owner}/{repo}/labels` | CRUD on labels |
| Assignees | `GET /repos/{owner}/{repo}/assignees` | Available assignees |
| Update issue | `PATCH /repos/{owner}/{repo}/issues/{number}` | Labels, assignees, state |
| Pull requests | `GET /repos/{owner}/{repo}/pulls` | Linked PRs (cross-ref via timeline) |
| Issue timeline | `GET /repos/{owner}/{repo}/issues/{number}/timeline` | Shows linked PRs, cross-refs |
| Releases | `GET /repos/{owner}/{repo}/releases` | Release-please versions |
| Release by tag | `GET /repos/{owner}/{repo}/releases/tags/{tag}` | Specific version details |

### Rate limit handling

- GitHub allows 5000 requests/hour per authenticated user
- Display remaining rate limit in the UI footer
- SQLite cache with conditional requests (ETags) reduces actual API calls
- When cache is implemented: use `If-None-Match` header to get 304 responses (don't count against rate limit)

---

## Core features

### 1. Multi-repo issue aggregation

- Admin adds repos by owner/name or by browsing their GitHub orgs
- All issues from tracked repos appear in a single unified view
- Each issue row shows which repo it belongs to (with color-coded repo badges)
- Issues from all repos are sortable and filterable together

### 2. Views (Notion/Airtable style)

Users can switch between four view types. Each view can be saved with its own filter/sort/group configuration.

#### 2a. Table view (default)

Spreadsheet-style with configurable columns:

| Column | Source | Sortable | Notes |
|---|---|---|---|
| Status | GitHub label (`to do`, `doing`, `done`) | Yes | Color-coded pills |
| Title | Issue title | Yes | Clickable, opens detail sidebar |
| Repo | Repository name | Yes | Color badge |
| Priority | Label or custom override | Yes | `critical` / `high` / `medium` / `low` |
| Assignee | GitHub assignee(s) | Yes | Avatar + name |
| Labels | All GitHub labels | No | Colored chips |
| Linked PRs | Timeline cross-refs | No | PR icon + number, click opens GH |
| Created | Issue created_at | Yes | Relative time |
| Updated | Issue updated_at | Yes | Relative time |
| Milestone | GitHub milestone | Yes | Text |
| Version | Release-please tag | Yes | e.g., `v2.3.1` |

Features:
- Column reordering (drag and drop)
- Column show/hide
- Inline editing for: assignee, labels, priority, status
- Multi-select rows for bulk actions (assign, label, close)
- Resizable columns

#### 2b. Kanban view

- Columns = status labels (`to do`, `doing`, `in review`, `done`)
- Cards show: title, repo badge, priority indicator, assignee avatar, linked PR count
- Drag and drop cards between columns (triggers label change via GitHub API)
- Configurable column mapping (which labels map to which columns)
- Swimlanes option: group by repo, assignee, or priority

#### 2c. List view

- Compact rows, minimal columns (status icon, title, repo, assignee, updated)
- Designed for quick scanning on mobile
- Expandable rows (click to show more detail inline)
- Checkbox for bulk selection

#### 2d. Timeline view

- Horizontal timeline grouped by repo
- Issues plotted by created date, with milestone markers
- Release-please versions shown as vertical markers on the timeline
- Color-coded by status
- Zoom in/out (week, month, quarter)
- Useful for roadmap-style planning visibility

### 3. Issue detail sidebar / modal

When clicking an issue title, a large right sidebar (desktop) or full-screen modal (mobile) opens:

**Header:**
- Issue title (editable inline)
- Status badge
- Repo link (opens repo on GitHub)
- "Open on GitHub" button (external link)

**Metadata panel (left or top):**
- Assignees (editable, multi-select dropdown)
- Labels (editable, multi-select with color preview)
- Priority (editable dropdown)
- Milestone
- Linked PRs (each clickable, opens PR on GitHub in new tab)
- Created / updated timestamps
- Version (release-please tag if applicable)

**Body:**
- Issue description rendered as markdown
- Full comment thread (read-only, rendered as markdown)
- Each comment shows: author avatar, author name, timestamp, body
- "Reply on GitHub" button at the bottom (opens the issue comment box on GitHub)

### 4. Label and priority management

#### Status labels (opinionated defaults)

The app uses GitHub labels as the status system. On repo setup, the app creates these labels if they don't exist:

| Label | Color | Meaning |
|---|---|---|
| `status: to do` | `#e6e6e6` | Backlog / not started |
| `status: doing` | `#fbca04` | In progress |
| `status: in review` | `#1d76db` | PR open, awaiting review |
| `status: done` | `#0e8a16` | Completed |

#### Priority labels

| Label | Color | Meaning |
|---|---|---|
| `priority: critical` | `#b60205` | Drop everything |
| `priority: high` | `#d93f0b` | Next up |
| `priority: medium` | `#fbca04` | Normal queue |
| `priority: low` | `#0e8a16` | Nice to have |

#### Label operations from the UI

- Add/remove labels on single or multiple issues
- Change priority with a single click (removes old priority label, adds new one)
- Change status with a single click or drag (kanban)
- Bulk label operations on selected issues
- Label management page: create, edit, delete labels across repos

#### Assignee operations

- Assign/unassign from the table (inline dropdown)
- Assign/unassign from the detail sidebar
- Bulk assign on selected issues
- Show available assignees per repo (fetched from GitHub)

### 5. Release-please integration

Since the team uses release-please for versioning:

**Release history panel (per repo):**
- List of all releases with version tag, date, and release notes
- Click a version to see which issues were closed in that release (parsed from release-please changelog)
- Current (latest) version prominently displayed per repo

**Version column in table view:**
- Shows which release an issue was included in (if closed and tagged)
- Filterable: "show me all issues shipped in v2.3.0"

**Release timeline:**
- In the timeline view, release tags appear as vertical markers
- Visual grouping of issues by the release they shipped in

### 6. Filtering and search

**Filter bar (persistent across views):**

| Filter | Type | Options |
|---|---|---|
| Repo | Multi-select dropdown | All tracked repos |
| Assignee | Multi-select dropdown | All assignees across repos |
| Label | Multi-select dropdown | All labels (union across repos) |
| Priority | Multi-select dropdown | Critical, high, medium, low, unset |
| Status | Multi-select dropdown | To do, doing, in review, done |
| State | Toggle | Open / closed / all |
| Milestone | Multi-select dropdown | All milestones |
| Version | Multi-select dropdown | All release tags |
| Text search | Free text input | Searches title + body |
| Date range | Date picker | Created or updated within range |

**Saved filters:**
- Save current filter combination as a named view
- Quick-switch between saved views via tabs
- Default view configurable per user

### 7. Linked pull requests

- For each issue, show associated PRs (detected via GitHub timeline events and cross-references)
- PR status indicator: draft, open, merged, closed
- Click PR number to open on GitHub in a new tab
- In table view: PR column shows count + status icons
- In detail sidebar: full PR list with title, status, and link

### 8. Keyboard navigation and command palette

Gira is keyboard-first, inspired by Linear. The entire app should be navigable without a mouse.

**Command palette (Cmd+K / Ctrl+K):**
- Fuzzy search across issues, repos, views, and actions
- Type to filter, arrow keys to navigate, Enter to select
- Actions available: change status, assign, set priority, switch view, navigate
- Recent commands remembered for quick re-access

**Global shortcuts:**

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open command palette |
| `C` | Create new issue (opens GitHub new issue in new tab) |
| `S` | Change status of selected issue |
| `P` | Set priority of selected issue |
| `L` | Manage labels on selected issue |
| `A` | Set assignee on selected issue |
| `I` | Assign to me |
| `X` | Toggle select current issue |
| `Shift+Up/Down` | Multi-select issues |
| `Enter` | Open issue detail sidebar |
| `Esc` | Close sidebar / clear selection / go back |
| `?` | Show keyboard shortcut help overlay |

**Navigation shortcuts (G then ...):**

| Shortcut | Destination |
|---|---|
| `G` then `M` | My issues |
| `G` then `T` | Triage inbox |
| `G` then `K` | Kanban view |
| `G` then `A` | All issues (table) |
| `G` then `S` | Settings |

**Design rules:**
- Shortcuts only fire when no input/textarea is focused
- Show shortcut hints in tooltips on buttons and menu items
- Visual focus indicator on the currently selected row/card
- Shortcut cheatsheet accessible via `?` key at all times

### 9. Triage inbox

A dedicated view for incoming issues that haven't been reviewed yet. Prevents the backlog from becoming a dumping ground.

**How it works:**
- New issues (created since last triage session, or never triaged) appear in the triage inbox
- Triage state stored in SQLite (`triage_state` table), not on GitHub
- Issues in triage are excluded from other views by default (toggle to include)

**Triage actions (per issue):**

| Action | Shortcut | Result |
|---|---|---|
| Accept | `1` | Moves to backlog (status: to do), prompts for priority |
| Decline | `2` | Closes issue on GitHub with optional comment |
| Mark as duplicate | `3` | Links to existing issue, closes as duplicate |
| Snooze | `H` | Hides until date or new activity |

**Triage flow:**
- Issues appear in a stack/list, one at a time or as a filtered list
- After triaging, the next issue auto-focuses
- Counter badge on the triage nav item shows pending count
- Keyboard-optimized: triage an entire batch without touching the mouse

### 10. Issue snoozing

Hide issues temporarily without closing them. They reappear automatically.

**Snooze options:**
- Until a specific date (date picker)
- Until tomorrow / next week / next month (quick picks)
- Until new activity (any comment, label change, or PR link on the issue)

**Behavior:**
- Snoozed issues hidden from all views by default
- "Show snoozed" toggle available in filter bar
- Snoozed issues panel: see all snoozed issues with their wake date
- When an issue wakes up, it returns to its previous view position
- Visual indicator (clock icon) on recently unsnoozed issues

**Wake-up check:**
- On each data fetch, compare GitHub `updated_at` against `snoozed_at`
- If `updated_at > snoozed_at` and `wake_on_activity` is true, auto-unsnooze
- Date-based snooze checked on page load / navigation

### 11. My issues view

A personal dashboard showing everything assigned to the logged-in user across all tracked repos.

**Layout:**
- Grouped by status (to do, doing, in review)
- Each group sorted by priority (critical first), then by updated date
- Shows repo badge, priority indicator, linked PR status
- Quick-action buttons for status change and snooze

**Sections:**
- **Active** (assigned to me, open, status: doing or in review)
- **Up next** (assigned to me, open, status: to do, sorted by priority)
- **Recently completed** (assigned to me, closed in the last 7 days)
- **Snoozed** (my snoozed issues, collapsible)

**Access:** Always available in sidebar nav, keyboard shortcut `G` then `M`

### 12. Issue relationships

Lightweight cross-issue linking stored in SQLite (not on GitHub). Enables tracking dependencies across repos, especially useful for FE/BE/data collaboration.

**Relationship types:**

| Type | Meaning | Display |
|---|---|---|
| `relates_to` | Related work, good to be aware of | Link icon |
| `blocks` | This issue must be done before the target | Red blocking indicator |
| `blocked_by` | This issue is waiting on another issue | Yellow waiting indicator |
| `duplicate_of` | This issue is a duplicate of another | Grey duplicate badge |

**Behavior:**
- Relationships are bidirectional in display: if A blocks B, then B shows "blocked by A"
- Add relationships from the issue detail sidebar (search/autocomplete for target issue)
- Relationships visible in the detail sidebar under a "Related issues" section
- In table/kanban views: blocking indicator icon if the issue has blockers
- `blocks` / `blocked_by` create a simple dependency chain (no complex DAG validation needed for MVP)
- Relationships stored locally in SQLite, so they're fast and don't consume GitHub API calls
- Useful for cross-repo coordination: e.g., FE issue relates to BE issue relates to data pipeline issue

---

## API routes (Next.js App Router)

```
/api/auth/[...nextauth]     - NextAuth.js GitHub OAuth
/api/workspaces              - CRUD workspaces
/api/workspaces/[id]/repos   - CRUD tracked repos
/api/workspaces/[id]/members - CRUD workspace members
/api/workspaces/[id]/views   - CRUD saved views

/api/issues                  - GET aggregated issues (with filters)
/api/issues/mine             - GET issues assigned to current user
/api/issues/triage           - GET untriaged issues
/api/issues/snoozed          - GET snoozed issues
/api/issues/[owner]/[repo]/[number]          - GET single issue detail
/api/issues/[owner]/[repo]/[number]/comments - GET issue comments
/api/issues/[owner]/[repo]/[number]          - PATCH update issue (labels, assignees, state)
/api/issues/[owner]/[repo]/[number]/triage   - POST triage action (accept, decline, snooze)
/api/issues/[owner]/[repo]/[number]/snooze   - POST/DELETE snooze or unsnooze
/api/issues/[owner]/[repo]/[number]/relationships - GET/POST/DELETE issue relationships
/api/issues/bulk             - POST bulk operations (label, assign, close)

/api/repos/[owner]/[repo]/labels    - GET/POST/PATCH/DELETE labels
/api/repos/[owner]/[repo]/releases  - GET releases (release-please)
/api/repos/[owner]/[repo]/assignees - GET available assignees

/api/cache/status            - GET cache stats and rate limit info
```

---

## UI layout

### Desktop layout

```
+------------------------------------------------------------------+
| Top bar: Gira logo | Workspace name          | Cmd+K search | Avatar |
+----------+-------------------------------------------------------+
| Sidebar  | Filter bar: [Repo v] [Status v] [Priority v] [Search...]  |
|          +-------------------------------------------------------+
| My issues|                                       |                |
| Triage(3)|  Main content area                    | Detail sidebar |
| All views|  (table / kanban / list / timeline)   | (issue detail) |
|  Table   |                                       | 40% width      |
|  Kanban  |                                       |                |
|  List    |                                       |                |
| -------- |                                       |                |
| Settings |                                       |                |
+----------+-------------------------------------------------------+
| Footer: Rate limit: 4832/5000 | Last synced: 12s ago | Gira v0.1.0 |
+------------------------------------------------------------------+
```

### Mobile layout

- Filter bar collapses into a filter icon + bottom sheet
- List view is the default on mobile (most compact)
- Issue detail opens as full-screen modal (slide up)
- Kanban scrolls horizontally
- Table scrolls horizontally with frozen first column (title)

---

## Milestones

### Phase 1 - MVP (core loop)

- [ ] GitHub OAuth login
- [ ] Add/remove tracked repos
- [ ] Table view with all columns
- [ ] Issue detail sidebar with description + comments (read-only)
- [ ] Inline label and assignee editing (single issue)
- [ ] Status and priority label system
- [ ] Basic filters: repo, status, priority, assignee, state
- [ ] Open on GitHub links (issues + PRs)
- [ ] SQLite for workspace config + saved views
- [ ] Responsive layout (desktop + mobile)
- [ ] Keyboard navigation (global shortcuts + row focus)
- [ ] Command palette (Cmd+K) with issue search and actions
- [ ] Triage inbox with accept / decline / duplicate / snooze actions
- [ ] My issues view (personal dashboard grouped by status)

### Phase 2 - Kanban, bulk, and relationships

- [ ] Kanban view with drag-and-drop status changes
- [ ] Swimlanes (group by repo, assignee, or priority)
- [ ] List view (compact)
- [ ] Saved views (named filter + view type combos)
- [ ] Bulk operations (multi-select + label/assign/close)
- [ ] Column customization (reorder, show/hide, resize)
- [ ] Issue snoozing (date-based + activity-based wake-up)
- [ ] Issue relationships (relates to, blocks, blocked by, duplicate of)
- [ ] Cross-repo relationship linking with search/autocomplete

### Phase 3 - Release-please and timeline

- [ ] Release history panel per repo
- [ ] Version column with release mapping
- [ ] Timeline view
- [ ] "Issues in release" drill-down
- [ ] Release markers on timeline

### Phase 4 - Caching and performance

- [ ] SQLite response cache with ETags
- [ ] Conditional requests (304 Not Modified)
- [ ] Background refresh (stale-while-revalidate pattern)
- [ ] Rate limit monitoring and throttling

### Phase 5 - Multi-tenant and invites

- [ ] Workspace invites (email-based)
- [ ] Viewer role (read-only via admin token)
- [ ] Workspace settings page
- [ ] Per-workspace label configuration

### Phase 6 - Projects (future)

- [ ] Project grouping across repos (e.g., "Pulse v3 launch")
- [ ] Project progress bar and status
- [ ] Project-level timeline and milestones

---

## Design guidelines

- Use shadcn/ui components as the foundation
- Dark mode support from the start (respect system preference)
- Accent color: configurable per workspace (default: GitHub-style blue)
- Typography: Inter or system font stack
- Density: default to compact (more issues visible), with a comfort toggle
- Loading states: skeleton loaders, not spinners
- Error states: inline error messages with retry buttons
- Empty states: friendly illustrations + "Add your first repo" CTA

---

## Out of scope (for now)

- Creating new issues from the app (use GitHub for that)
- Commenting on issues from the app (use GitHub for that)
- GitHub Actions integration
- Notifications / webhooks
- Time tracking
- Custom fields beyond priority
- Git blame / code browsing
- CI/CD status per issue

## Explicitly not planned

- Sub-issues / sub-tasks (adds complexity without clear value, use checklists in issue body instead)
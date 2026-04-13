import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
const entries = [
  {
    date: "2026-04-13",
    version: "1.32.0",
    title: "Customizable Table Columns",
    description:
      "Table view now has a Columns button that opens a dropdown of 11 toggleable columns (status, repo, priority, effort, WSJF, assignee, labels, version, AI, created, updated). Deselect to hide instantly; click Save view to persist the layout for next time. A Reset button restores all columns. Title is always shown.",
  },
  {
    date: "2026-04-13",
    version: "1.31.0",
    title: "Impact Label Boost",
    description:
      "Tag issues with 'impact: customer' (or any 'impact: <type>' you create) to multiply their WSJF score by 1.5× per label, capped at 3×. Boosted scores display in purple with a lightning icon on the table and kanban cards. New Settings card discovers every impact label across tracked repos with N/M coverage, syncs missing labels in one click, and lets you create new types (e.g. 'impact: revenue') that get pushed to all repos at once.",
  },
  {
    date: "2026-04-13",
    version: "1.30.0",
    title: "WSJF Priority Scoring",
    description:
      "New WSJF (Weighted Shortest Job First) column on the issues table — score = priority ÷ effort, range 0.33–4.00. Critical + low effort issues float to 4.0; missing labels show as \"—\". Kanban cards display a small score badge next to the issue number, and WSJF is selectable as a per-column sort in the kanban (and as a default in Settings).",
  },
  {
    date: "2026-04-10",
    version: "1.29.1",
    title: "Closed-Issues SQLite Cache",
    description:
      "Historical closed issues are now cached locally in SQLite, since past months are immutable. First /agents load does a one-time backfill; every subsequent load makes ~1 GitHub API call per repo for the current month instead of refetching the entire window. Saves dozens of API calls per page load and lets the agents dashboard cover months of history without rate-limit pain.",
  },
  {
    date: "2026-04-10",
    version: "1.29.0",
    title: "Agents Control Room",
    description:
      "New /agents page that visualizes every automated run — Claude AI workflows + GitHub Actions — in one place. Three KPI cards (Active, Completed, Health) with a date range selector. Active runs show as horizontal pipeline rails with stage blocks; click any run for a drawer with linked PRs, Claude comment log, and GH Action job details. PR Attention panel ranks open agent PRs by risk (age + conflicts + review state). Workflow import flow under Settings opts in to which workflows get synced.",
  },
  {
    date: "2026-04-10",
    version: "1.28.1",
    title: "Command Palette Open/Closed/All Toggle",
    description:
      "The command palette issue search now has an open/closed/all toggle so you can find a closed issue (e.g. #81) without leaving the palette. Defaults to open to keep the cached fast path; switching to closed or all triggers a fresh fetch.",
  },
  {
    date: "2026-04-10",
    version: "1.28.0",
    title: "\"Not set\" Filter Option",
    description:
      "Added an explicit \"not set\" choice at the bottom of the Status, Priority, Effort, AI, and Version filter dropdowns so you can target issues that are missing those fields — useful for triage and label cleanup.",
  },
  {
    date: "2026-04-10",
    version: "1.27.2",
    title: "Kanban Priority Sort Direction Fix",
    description:
      "Fixed a bug where sorting kanban columns by priority \"desc\" put low/unset items first instead of critical. Same fix applied to effort sorting. Direction semantics now read naturally — desc means \"most important first.\"",
  },
  {
    date: "2026-04-10",
    version: "1.27.1",
    title: "Hydration Mismatch Fixes",
    description:
      "Resolved server/client hydration warnings caused by reading from localStorage during render (favorite teammate) and by relative time strings naturally diverging between SSR and client. Pages now render without console noise on first load.",
  },
  {
    date: "2026-04-10",
    version: "1.27.0",
    title: "Sync Gira Labels to Tracked Repos",
    description:
      "Per-repo label sync action on the Tracked Repos page — push the canonical Gira label set (status / priority / effort / claude) to a GitHub repo with one click. Skips labels that already exist; toast tells you how many were created.",
  },
  {
    date: "2026-04-07",
    version: "1.26.1",
    title: "Copy Metadata Issue Number Fix",
    description:
      "Fixed the issue number shown in the copy-metadata output when copying issue details from the detail header.",
  },
  {
    date: "2026-04-02",
    version: "1.26.0",
    title: "Version Filter & Release Tracking",
    description:
      "Issues are now mapped to GitHub releases based on their closed date. A Version column in the table shows which release tag each closed issue belongs to. The Version filter dropdown appears when versioned issues exist, with options grouped by repo. Switch to closed or all view to see release associations.",
  },
  {
    date: "2026-04-02",
    version: "1.25.0",
    title: "Default Filter Presets",
    description:
      "Save your preferred filters in Settings so they auto-apply when opening the Issues page. Set default repos, status, priority, effort, AI state, assignees, and open/closed/all. Presets persist across sessions like kanban sort preferences. Clearing filters on the issues page won't re-apply defaults until your next visit.",
  },
  {
    date: "2026-04-02",
    version: "1.24.0",
    title: "AI Filter & PR Toggle",
    description:
      "New AI filter dropdown in the issues filter bar lets you filter by Claude workflow state — reviewing, reviewed, working, done, failed, and more. A new PR toggle button filters to issues that have linked pull requests.",
  },
  {
    date: "2026-04-01",
    version: "1.23.0",
    title: "Metrics Dashboard & Mini Metrics Row",
    description:
      "New dedicated Dashboard page with 17 metric cards — status distribution, priority breakdown, assignee workload, untriaged count, effort split, issues per repo, average issue age, oldest open issue, on-fire indicator, filter summary, closed over time, created vs closed trend, average resolution time, weekly comparison, closed by person, resolution time distribution, and daily streak. Toggle which metrics appear as a collapsible mini row above the issues page filters. Historical metrics (last 30 days) only fetch data when visible. Preferences for metric selection and collapse state persist across sessions.",
  },
  {
    date: "2026-04-01",
    version: "1.22.0",
    title: "AI-workflow Status Alignment Automation",
    description:
      "Issue status now syncs automatically with Claude AI workflow state. Starting a review or work sets status to 'doing'. When review completes, status moves to 'in review'. Works for both actions triggered in Gira and labels set by GitHub Actions.",
  },
  {
    date: "2026-04-01",
    version: "1.21.0",
    title: "AI Status in Issue Detail",
    description:
      "The issue detail sheet now shows the Claude AI workflow state with actionable controls — start a review or kick off work directly from the sidebar. Reviewed and Done states display as colored pills for quick scanning.",
  },
  {
    date: "2026-04-01",
    version: "1.20.0",
    title: "Kanban Column Sorting",
    description:
      "Each kanban column now has sort controls — order by Priority, Repo, Effort, or Time. Time sorting is context-aware: Done sorts by closed date, To Do by created date, and Doing/In Review by last updated. Direction toggles between ascending and descending. Preferred column ordering can be saved in Settings.",
  },
  {
    date: "2026-04-01",
    version: "1.19.0",
    title: "Unified Issues Page",
    description:
      "My Issues and All Issues are now one page. Clicking 'My Issues' in the sidebar filters to your assigned issues. A new list view groups issues by status (Active, Up Next, Done) with drag-and-drop between sections. Choose your default view (list, table, or kanban) in Settings.",
  },
  {
    date: "2026-04-01",
    version: "1.18.0",
    title: "Triage Improvements",
    description:
      "Auto-promoted issues in triage now show the issue title and link to the detail sheet. Stale issues are also clickable. Recently completed issues sort by closed date.",
  },
  {
    date: "2026-04-01",
    version: "1.17.2",
    title: "Improved Issue Sorting",
    description:
      "Closed issues now sort by closed date (most recent first). Open issues sort by creation date (newest first). Switching between open/closed views automatically resets the sort order.",
  },
  {
    date: "2026-04-01",
    version: "1.17.1",
    title: "Auto Database Migrations",
    description:
      "Database schema updates now run automatically on server start. Pull the latest code, restart your dev server, and new tables are created — no manual SQL or seed scripts needed.",
  },
  {
    date: "2026-04-01",
    version: "1.17.0",
    title: "Closed Issue Notifications & Watch",
    description:
      "Get notified when issues you created, are assigned to, or are watching get closed. Bell icon in the top bar shows unread count with a popover listing details. Watch any issue via the eye icon in the issue detail sidebar.",
  },
  {
    date: "2026-04-01",
    version: "1.16.1",
    title: "Click-to-Copy Issue Link",
    description:
      "Clicking the issue number (#) in the issues table now copies the GitHub issue URL to your clipboard with a toast confirmation.",
  },
  {
    date: "2026-04-01",
    version: "1.16.0",
    title: "Closed Issues Browser",
    description:
      "Browse closed issues with a week-by-week navigator. Defaults to the current week with backward pagination. Includes a sortable Closed column and closed date in the issue detail sidebar.",
  },
  {
    date: "2026-04-01",
    version: "1.15.0",
    title: "Auto Status Sync on Close",
    description:
      "Closing an issue now automatically sets its status label to 'done', whether closed from Giraf or directly on GitHub. Giraf detects externally closed issues on the next fetch and fixes the label.",
  },
  {
    date: "2026-04-01",
    version: "1.14.0",
    title: "Changelog Page",
    description:
      "Added a changelog page to track what's new. Accessible from sidebar, command palette, and G C shortcut.",
  },
  {
    date: "2026-04-01",
    version: "1.13.0",
    title: "AI Workflow Column",
    description:
      "Added Claude AI column to the issues table with review-to-work pipeline for intelligent issue triage.",
  },
  {
    date: "2026-03-31",
    version: "1.12.0",
    title: "Inline Editing & Bulk Actions",
    description:
      "Edit labels, status, and priority directly in the issues table. Select multiple issues for bulk updates.",
  },
  {
    date: "2026-03-30",
    version: "1.11.0",
    title: "Repo Filter Short Names",
    description:
      "Repo filter now shows short aliases instead of full repository paths for a cleaner UI.",
  },
  {
    date: "2026-03-29",
    version: "1.10.0",
    title: "Effort Labels",
    description:
      "Full support for effort labels (low/medium/high) on issues, with effort hidden from the labels column to reduce clutter.",
  },
  {
    date: "2026-03-28",
    version: "1.9.0",
    title: "Copy Metadata Button",
    description:
      "Quickly copy issue metadata (number, title, repo, status) from the issue detail header.",
  },
  {
    date: "2026-03-27",
    version: "1.8.1",
    title: "Command Palette Search Fix",
    description:
      "Issue search in the command palette now uses exact substring matching and shows all issues.",
  },
  {
    date: "2026-03-26",
    version: "1.8.0",
    title: "Priority Escalation System",
    description:
      "Automatic priority promotion when you close higher-priority issues. Weekly review with over-budget warnings, stale issue detection, and inline priority editing.",
  },
  {
    date: "2026-03-25",
    version: "1.7.0",
    title: "Triage Table with Bulk Actions",
    description:
      "Triage now uses a table view with multi-select, bulk priority/assignee assignment, and repo filtering.",
  },
  {
    date: "2026-03-24",
    version: "1.6.0",
    title: "Remove Priority Option",
    description:
      "New 'Remove priority' option in the priority editor to send issues back to the unranked backlog.",
  },
  {
    date: "2026-03-22",
    version: "1.5.0",
    title: "Kanban Board",
    description:
      "Drag-and-drop kanban board view with status columns. Also supports drag between My Issues sections.",
  },
  {
    date: "2026-03-21",
    version: "1.4.0",
    title: "Optimistic Updates",
    description:
      "Status, priority, and assignee changes now update instantly in the UI before the server responds.",
  },
  {
    date: "2026-03-20",
    version: "1.3.0",
    title: "Renamed to Giraf",
    description:
      "Project renamed from Gira to Giraf with new branding, banner, and favicon.",
  },
  {
    date: "2026-03-19",
    version: "1.0.0",
    title: "Initial Release",
    description:
      "First official release — issue management, triage inbox, command palette, keyboard shortcuts, and the full issue detail sidebar.",
  },
]

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Changelog</h2>
        <p className="mt-1 text-muted-foreground">
          What&apos;s new and improved in Giraf.
        </p>
      </div>

      <div className="space-y-4">
        {entries.map((entry, i) => (
          <div key={entry.date + entry.title}>
            {i > 0 && <Separator className="mb-4" />}
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {entry.date}
                  </p>
                  <Badge variant="outline" className="text-[10px]">
                    v{entry.version}
                  </Badge>
                </div>
                <CardTitle className="text-base">{entry.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {entry.description}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
const entries = [
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
];

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
  );
}

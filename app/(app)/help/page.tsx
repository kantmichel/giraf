import {
  Inbox,
  ListTodo,
  LayoutList,
  GitFork,
  Clock,
  Tag,
  Users,
  Keyboard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const concepts = [
  {
    icon: Inbox,
    title: "Triage",
    description:
      "Triage is about reviewing new issues that nobody has looked at yet. When an issue is created on a tracked repo (or existed before you added the repo), it shows up in the Triage inbox.",
    details: [
      "Accept — \"This is real work.\" Assigns a status (to do) and a priority. The issue moves to the backlog.",
      "Decline — \"Not worth doing.\" Closes the issue on GitHub.",
      "Snooze — \"Not now.\" Hides the issue until a specific date or until someone comments on it.",
    ],
    tip: "When you first start using Gira, all existing issues will appear in Triage since none have been reviewed yet. After you process them, only truly new issues will show up.",
  },
  {
    icon: ListTodo,
    title: "My Issues",
    description:
      "Your personal dashboard showing everything assigned to you across all tracked repos. Issues are grouped by where they are in the workflow.",
    details: [
      "Active — Issues you're currently working on (status: doing or in review).",
      "Up Next — Issues assigned to you that haven't been started yet (status: to do), sorted by priority.",
      "Recently Completed — Issues you closed in the last 7 days.",
      "Snoozed — Issues you've temporarily hidden.",
    ],
    tip: "This view only shows issues where you are an assignee on GitHub.",
  },
  {
    icon: LayoutList,
    title: "All Issues",
    description:
      "A unified table view of every issue across all tracked repos. Filter by repo, status, priority, assignee, or search by title. Click any column header to sort.",
    details: [
      "Filters are stored in the URL — share a filtered view by copying the link.",
      "Click an issue title to open the detail sidebar without leaving the page.",
      "The state toggle (open/closed/all) refetches from GitHub. Other filters work client-side for speed.",
    ],
  },
  {
    icon: GitFork,
    title: "Tracked Repos",
    description:
      "Gira only shows issues from repos you explicitly add. When you add a repo, Gira automatically creates status and priority labels on that GitHub repo if they don't exist.",
    details: [
      "Status labels: to do, doing, in review, done.",
      "Priority labels: critical, high, medium, low.",
      "Removing a repo from Gira doesn't delete the labels or affect the issues on GitHub.",
    ],
  },
  {
    icon: Tag,
    title: "Status & Priority",
    description:
      "Gira uses GitHub labels as its status and priority system. There's no separate database — the labels on the issue are the source of truth.",
    details: [
      "Status labels start with \"status: \" (e.g., status: doing).",
      "Priority labels start with \"priority: \" (e.g., priority: high).",
      "Changing status or priority in Gira updates the labels on GitHub immediately.",
    ],
  },
  {
    icon: Clock,
    title: "Snoozing",
    description:
      "Hide an issue temporarily without closing it. Snoozed issues disappear from all views and come back automatically.",
    details: [
      "Snooze until a date — the issue reappears on that day.",
      "Snooze until new activity — the issue reappears when someone comments or changes it.",
      "You can see all your snoozed issues in the Snoozed section of My Issues.",
    ],
  },
  {
    icon: Users,
    title: "GitHub as Source of Truth",
    description:
      "Gira is a viewing and management layer — GitHub remains the single source of truth. All issue data, comments, labels, and assignments live on GitHub.",
    details: [
      "Commenting on issues happens on GitHub (Gira provides a \"Reply on GitHub\" link).",
      "Creating new issues happens on GitHub.",
      "Changes made in Gira (status, priority, assignees) are reflected on GitHub instantly.",
    ],
  },
  {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    description:
      "Gira is keyboard-first. You can navigate the entire app, open issues, and trigger actions without touching the mouse.",
    details: [
      "⌘K — Open the command palette to search issues, navigate, or toggle dark mode.",
      "G then M — Go to My Issues. G then T — Triage. G then A — All Issues. G then S — Settings.",
      "⌘B — Toggle the sidebar. D — Toggle dark mode.",
      "? — Show the full shortcut cheatsheet.",
      "Esc — Close the current sidebar, dialog, or palette.",
    ],
    tip: "Chord shortcuts (like G then M) have a 1-second window. Press G, then the second key within a second.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">How Gira Works</h2>
        <p className="mt-1 text-muted-foreground">
          Gira aggregates GitHub issues across multiple repos into one interface.
          Here's how each part works.
        </p>
      </div>

      <div className="space-y-4">
        {concepts.map((concept, i) => (
          <div key={concept.title}>
            {i > 0 && <Separator className="mb-4" />}
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                    <concept.icon className="size-4 text-primary" />
                  </div>
                  {concept.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{concept.description}</p>
                {concept.details && (
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {concept.details.map((detail, j) => (
                      <li key={j} className="flex gap-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {concept.tip && (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <strong>Tip:</strong> {concept.tip}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

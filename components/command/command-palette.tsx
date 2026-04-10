"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutList,
  ListTodo,
  Inbox,
  GitFork,
  Settings,
  HelpCircle,
  ScrollText,
  Moon,
  Sun,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useIssues } from "@/hooks/use-issues";
import { IssueStatusBadge } from "@/components/issues/issue-status-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import type { NormalizedIssue } from "@/types/github";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueSelect?: (issue: NormalizedIssue) => void;
  issues?: NormalizedIssue[];
}

function useNavItems() {
  const { data: session } = useSession();
  const username = session?.user?.githubUsername;
  return useMemo(() => [
    { label: "All Issues", href: "/issues", icon: LayoutList, shortcut: "G A" },
    { label: "My Issues", href: username ? `/issues?assignees=${username}` : "/issues", icon: ListTodo, shortcut: "G M" },
    { label: "Triage", href: "/triage", icon: Inbox, shortcut: "G T" },
    { label: "Repos", href: "/repos", icon: GitFork },
    { label: "Settings", href: "/settings", icon: Settings, shortcut: "G S" },
    { label: "Help", href: "/help", icon: HelpCircle, shortcut: "G H" },
    { label: "Changelog", href: "/changelog", icon: ScrollText, shortcut: "G C" },
  ], [username]);
}

export function CommandPalette({ open, onOpenChange, onIssueSelect, issues: issuesProp }: CommandPaletteProps) {
  const router = useRouter();
  const navItems = useNavItems();
  const { resolvedTheme, setTheme } = useTheme();
  const [issueState, setIssueState] = useState<"open" | "closed" | "all">("open");
  const { allIssues } = useIssues({ state: issueState, repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], ai: [], version: [], hasPr: false, milestone: [], search: "" });
  const issues = issueState === "open" && issuesProp ? issuesProp : allIssues;

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl p-0"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search and navigate</DialogDescription>
        </DialogHeader>
        <Command
          className="rounded-xl"
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search issues, navigate, or run actions..." />
          <div className="flex items-center gap-1 border-b px-3 py-1.5" cmdk-group="">
            <span className="text-[11px] text-muted-foreground">Issues:</span>
            <div className="flex items-center gap-0.5 rounded-md border p-0.5">
              {(["open", "closed", "all"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-[11px] transition-colors",
                    issueState === s
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIssueState(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            <CommandGroup heading="Navigation">
              {navItems.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => navigate(item.href)}
                >
                  <item.icon className="mr-2 size-4" />
                  {item.label}
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  onOpenChange(false);
                }}
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="mr-2 size-4" />
                ) : (
                  <Moon className="mr-2 size-4" />
                )}
                Toggle dark mode
                <CommandShortcut>D</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            {issues.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Issues">
                  {issues.map((issue) => (
                    <CommandItem
                      key={issue.id}
                      value={`#${issue.number} ${issue.number} ${issue.title} ${issue.repo.name}`}
                      onSelect={() => {
                        onOpenChange(false);
                        if (onIssueSelect) {
                          onIssueSelect(issue);
                        } else {
                          window.open(issue.htmlUrl, "_blank");
                        }
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <IssueStatusBadge status={issue.status} />
                        <span className="truncate">{issue.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          #{issue.number}
                        </span>
                        <IssueRepoBadge repo={issue.repo.fullName} />
                      </div>
                      <ExternalLink className="ml-auto size-3 shrink-0 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

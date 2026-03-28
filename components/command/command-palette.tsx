"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutList,
  ListTodo,
  Inbox,
  GitFork,
  Settings,
  HelpCircle,
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
import { useIssues } from "@/hooks/use-issues";
import { IssueStatusBadge } from "@/components/issues/issue-status-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import type { NormalizedIssue } from "@/types/github";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueSelect?: (issue: NormalizedIssue) => void;
}

const navItems = [
  { label: "All Issues", href: "/issues", icon: LayoutList, shortcut: "G A" },
  { label: "My Issues", href: "/my-issues", icon: ListTodo, shortcut: "G M" },
  { label: "Triage", href: "/triage", icon: Inbox, shortcut: "G T" },
  { label: "Repos", href: "/repos", icon: GitFork },
  { label: "Settings", href: "/settings", icon: Settings, shortcut: "G S" },
  { label: "Help", href: "/help", icon: HelpCircle, shortcut: "G H" },
];

export function CommandPalette({ open, onOpenChange, onIssueSelect }: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { issues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], status: [], milestone: [], search: "" });

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Command Palette</DialogTitle>
        <DialogDescription>Search and navigate</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl p-0"
        showCloseButton={false}
      >
        <Command className="rounded-xl">
          <CommandInput placeholder="Search issues, navigate, or run actions..." />
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
                  {issues.slice(0, 50).map((issue) => (
                    <CommandItem
                      key={issue.id}
                      value={`${issue.number} ${issue.title} ${issue.repo.name}`}
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

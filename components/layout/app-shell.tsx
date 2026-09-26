"use client";

import { useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { FooterBar } from "./footer-bar";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutHelp } from "@/components/command/shortcut-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIssues } from "@/hooks/use-issues";
import type { NormalizedIssue } from "@/types/github";

export function AppShell({
  children,
  defaultSidebarOpen = true,
}: {
  children: React.ReactNode;
  /** Read from the sidebar cookie by the layout, so a collapsed sidebar
   *  survives a reload and the server renders what the client expects. */
  defaultSidebarOpen?: boolean;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The palette feeds the issues page's URL rather than opening a drawer of its
  // own — one drawer, one source of truth, and the link is always shareable.
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], age: [], ai: [], version: [], hasPr: false, milestone: [], search: "" });

  const openIssue = useCallback(
    (issue: NormalizedIssue) => {
      // Already on the issues page: keep the filters the user is looking at.
      // Coming from elsewhere: start clean, since those params mean nothing there.
      const params =
        pathname === "/issues"
          ? new URLSearchParams(searchParams.toString())
          : new URLSearchParams();
      params.set("repo", issue.repo.name);
      params.set("issue", String(issue.number));
      router.push(`/issues?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  useKeyboardShortcuts({
    onOpenCommandPalette: useCallback(() => setCommandOpen((o) => !o), []),
    onOpenShortcutHelp: useCallback(() => setHelpOpen(true), []),
  });

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <TopBar onOpenCommandPalette={() => setCommandOpen(true)} />
        <div className="min-w-0 flex-1 overflow-auto p-4">
          {children}
        </div>
        <FooterBar />
      </SidebarInset>
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onIssueSelect={openIssue}
        issues={allIssues}
      />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </SidebarProvider>
  );
}

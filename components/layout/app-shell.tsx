"use client";

import { useState, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { FooterBar } from "./footer-bar";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutHelp } from "@/components/command/shortcut-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIssues } from "@/hooks/use-issues";
import { useOpenIssue } from "@/hooks/use-open-issue";

export function AppShell({
  children,
  defaultSidebarOpen = true,
  version,
}: {
  children: React.ReactNode;
  /** From package.json, read by the server layout. */
  version: string;
  /** Read from the sidebar cookie by the layout, so a collapsed sidebar
   *  survives a reload and the server renders what the client expects. */
  defaultSidebarOpen?: boolean;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // The palette feeds the issues page's URL rather than opening a drawer of its
  // own — one drawer, one source of truth, and the link is always shareable.
  const openIssue = useOpenIssue();
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], effort: [], status: [], age: [], ai: [], version: [], hasPr: false, milestone: [], search: "" });

  useKeyboardShortcuts({
    onOpenCommandPalette: useCallback(() => setCommandOpen((o) => !o), []),
    onOpenShortcutHelp: useCallback(() => setHelpOpen(true), []),
  });

  return (
    // The shell is exactly one screen: top bar and footer stay put and pages
    // scroll inside the content area, never the window. <main> needs min-w-0 —
    // as a flex item it otherwise refuses to be narrower than its widest child,
    // and a wide board drags the whole page, top bar included, off-screen.
    <SidebarProvider defaultOpen={defaultSidebarOpen} className="h-svh">
      <AppSidebar version={version} />
      <SidebarInset className="min-w-0">
        <TopBar onOpenCommandPalette={() => setCommandOpen(true)} />
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {children}
        </div>
        <FooterBar version={version} />
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

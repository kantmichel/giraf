"use client";

import { useState, useCallback, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { FooterBar } from "./footer-bar";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutHelp } from "@/components/command/shortcut-help";
import { IssueDetailSidebar } from "@/components/issues/issue-detail-sidebar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useIssues } from "@/hooks/use-issues";
import type { NormalizedIssue } from "@/types/github";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteIssue, setPaletteIssue] = useState<NormalizedIssue | null>(null);

  // Fetch issues so we can sync paletteIssue with cache updates
  const { allIssues } = useIssues({ state: "open", repos: [], assignees: [], labels: [], priority: [], status: [], milestone: [], search: "" });

  // Sync paletteIssue with cache (optimistic updates)
  useEffect(() => {
    if (!paletteIssue) return;
    const updated = allIssues.find((i) => i.id === paletteIssue.id);
    if (updated) setPaletteIssue(updated);
  }, [allIssues]); // eslint-disable-line react-hooks/exhaustive-deps

  useKeyboardShortcuts({
    onOpenCommandPalette: useCallback(() => setCommandOpen((o) => !o), []),
    onOpenShortcutHelp: useCallback(() => setHelpOpen(true), []),
  });

  return (
    <SidebarProvider>
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
        onIssueSelect={setPaletteIssue}
        issues={allIssues}
      />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
      <IssueDetailSidebar
        issue={paletteIssue}
        open={paletteIssue !== null}
        onClose={() => setPaletteIssue(null)}
      />
    </SidebarProvider>
  );
}

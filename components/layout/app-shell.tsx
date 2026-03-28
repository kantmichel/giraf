"use client";

import { useState, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { TopBar } from "./top-bar";
import { FooterBar } from "./footer-bar";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutHelp } from "@/components/command/shortcut-help";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </SidebarProvider>
  );
}

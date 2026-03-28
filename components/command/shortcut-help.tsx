"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const shortcuts = [
  {
    section: "General",
    items: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["⌘", "B"], description: "Toggle sidebar" },
      { keys: ["D"], description: "Toggle dark mode" },
      { keys: ["?"], description: "Show this help" },
      { keys: ["Esc"], description: "Close panel / dialog" },
    ],
  },
  {
    section: "Navigation",
    items: [
      { keys: ["G", "A"], description: "Go to All Issues" },
      { keys: ["G", "M"], description: "Go to My Issues" },
      { keys: ["G", "T"], description: "Go to Triage" },
      { keys: ["G", "S"], description: "Go to Settings" },
      { keys: ["G", "H"], description: "Go to Help" },
    ],
  },
];

interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutHelp({ open, onOpenChange }: ShortcutHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Navigate Giraf without touching the mouse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((group) => (
            <div key={group.section}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="mx-0.5 text-xs text-muted-foreground">
                              then
                            </span>
                          )}
                          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

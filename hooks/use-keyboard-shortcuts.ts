"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

interface UseKeyboardShortcutsOptions {
  onOpenCommandPalette: () => void;
  onOpenShortcutHelp: () => void;
}

export function useKeyboardShortcuts({
  onOpenCommandPalette,
  onOpenShortcutHelp,
}: UseKeyboardShortcutsOptions) {
  const router = useRouter();
  const { data: session } = useSession();
  const username = session?.user?.githubUsername;
  const chordRef = useRef<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearChord = useCallback(() => {
    chordRef.current = null;
    if (chordTimerRef.current) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;

      // Cmd+K — always works, even in inputs
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenCommandPalette();
        return;
      }

      // All other shortcuts are suppressed when typing
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      // Handle chord second key
      if (chordRef.current === "g") {
        clearChord();
        const chordRoutes: Record<string, string> = {
          m: username ? `/issues?assignees=${username}` : "/issues",
          t: "/triage",
          a: "/issues",
          s: "/settings",
          h: "/help",
          c: "/changelog",
        };
        const route = chordRoutes[key];
        if (route) {
          event.preventDefault();
          router.push(route);
        }
        return;
      }

      // Start chord
      if (key === "g") {
        chordRef.current = "g";
        chordTimerRef.current = setTimeout(clearChord, 1000);
        return;
      }

      // Single key shortcuts
      switch (key) {
        case "?":
          event.preventDefault();
          onOpenShortcutHelp();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearChord();
    };
  }, [router, onOpenCommandPalette, onOpenShortcutHelp, clearChord, username]);
}

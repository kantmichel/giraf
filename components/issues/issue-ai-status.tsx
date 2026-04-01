"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { getLabelsToRemoveForAction } from "@/lib/claude-workflow";
import { cn } from "@/lib/utils";
import type { NormalizedIssue } from "@/types/github";

interface IssueAiStatusProps {
  issue: NormalizedIssue;
  claudeEnabled: boolean;
}

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <img
      src="/claudecode-color.svg"
      alt="Claude"
      className={cn("inline-block", className)}
    />
  );
}

const STATE_DISPLAY: Record<string, { icon: React.ReactNode; text: string; color: string; pill?: string }> = {
  "review-queued": { icon: <Loader2 className="size-3.5 animate-spin text-blue-500" />, text: "Review queued", color: "text-blue-500" },
  "reviewing": { icon: <ClaudeIcon className="size-3.5 animate-pulse" />, text: "Reviewing...", color: "text-amber-500" },
  "review-done": { icon: <Check className="size-3 text-amber-700 dark:text-amber-300" />, text: "Reviewed", color: "text-amber-700 dark:text-amber-300", pill: "bg-amber-100 dark:bg-amber-900/40" },
  "review-failed": { icon: <X className="size-3.5 text-red-500" />, text: "Review failed", color: "text-red-500" },
  "work-queued": { icon: <Loader2 className="size-3.5 animate-spin text-blue-500" />, text: "Work queued", color: "text-blue-500" },
  "working": { icon: <ClaudeIcon className="size-3.5 animate-pulse" />, text: "Working...", color: "text-amber-500" },
  "done": { icon: <Check className="size-3 text-green-700 dark:text-green-300" />, text: "Done", color: "text-green-700 dark:text-green-300", pill: "bg-green-100 dark:bg-green-900/40" },
  "failed": { icon: <X className="size-3.5 text-red-500" />, text: "Failed", color: "text-red-500" },
};

export function IssueAiStatus({ issue, claudeEnabled }: IssueAiStatusProps) {
  const [open, setOpen] = useState(false);
  const [notEnabledOpen, setNotEnabledOpen] = useState(false);
  const updateIssue = useUpdateIssue();

  const state = issue.claudeState;
  const display = state ? STATE_DISPLAY[state] : null;

  function handleStartReview() {
    const currentLabels = issue.labels
      .map((l) => l.name)
      .filter((l) => !l.startsWith("status: "));
    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels: [...currentLabels, "claude-review-start", "status: doing"] },
    });
    setOpen(false);
  }

  function handleStartWork() {
    const toRemove = getLabelsToRemoveForAction("start-work");
    const currentLabels = issue.labels
      .map((l) => l.name)
      .filter((l) => !toRemove.includes(l) && !l.startsWith("status: "));
    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels: [...currentLabels, "claude-start", "status: doing"] },
    });
    setOpen(false);
  }

  function handleClick() {
    if (!claudeEnabled) {
      setNotEnabledOpen(true);
      return;
    }
    setOpen(true);
  }

  // Not enabled — show nothing
  if (!claudeEnabled && !state) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1 whitespace-nowrap rounded-full px-1 py-0.5 text-[11px] hover:bg-accent",
              display?.pill && `${display.pill} px-1.5 py-0.5 font-medium`
            )}
            onClick={handleClick}
          >
            {display ? (
              <>
                {display.icon}
                <span className={display.color}>{display.text}</span>
              </>
            ) : (
              <ClaudeIcon className="size-4 opacity-40 hover:opacity-100" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {!state && (
              <Button size="sm" className="w-full gap-2" onClick={handleStartReview}>
                <ClaudeIcon className="size-3.5" />
                Start Review
              </Button>
            )}
            {state === "review-done" && (
              <Button size="sm" className="w-full gap-2" onClick={handleStartWork}>
                <ClaudeIcon className="size-3.5" />
                Start Work
              </Button>
            )}
            {(state === "review-queued" || state === "reviewing") && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Review in progress...
              </p>
            )}
            {(state === "work-queued" || state === "working") && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Work in progress...
              </p>
            )}
            {(state === "done" || state === "failed" || state === "review-failed") && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Manage in GitHub
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={notEnabledOpen} onOpenChange={setNotEnabledOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claude workflows not enabled</DialogTitle>
            <DialogDescription>
              Claude AI workflows are not enabled for {issue.repo.fullName}.
              Enable them in Settings → Claude AI Workflows.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setNotEnabledOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

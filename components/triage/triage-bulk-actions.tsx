"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { SnoozePopover } from "./snooze-popover";
import { PRIORITY_LABELS } from "@/lib/constants";
import { useBulkTriageAction } from "@/hooks/use-bulk-triage";
import type { NormalizedIssue } from "@/types/github";

const priorityValues = PRIORITY_LABELS.map((l) => l.name.replace("priority: ", ""));

interface TriageBulkActionsProps {
  selectedIssues: NormalizedIssue[];
  onClearSelection: () => void;
}

export function TriageBulkActions({
  selectedIssues,
  onClearSelection,
}: TriageBulkActionsProps) {
  const bulkAction = useBulkTriageAction();
  const { data: session } = useSession();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [assignToMe, setAssignToMe] = useState(true);
  const myUsername = session?.user?.githubUsername;

  const [favoriteTeammate] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gira-favorite-teammate");
  });
  const [assignTeammate, setAssignTeammate] = useState(false);

  if (selectedIssues.length === 0) return null;

  function handleAccept(priority: string) {
    const assignees: string[] = [];
    if (assignToMe && myUsername) assignees.push(myUsername);
    if (assignTeammate && favoriteTeammate) assignees.push(favoriteTeammate);

    bulkAction.mutate({
      issues: selectedIssues,
      action: "accept",
      priority,
      assignees: assignees.length > 0 ? assignees : undefined,
    });
    setAcceptOpen(false);
    onClearSelection();
  }

  function handleDecline() {
    bulkAction.mutate({ issues: selectedIssues, action: "decline" });
    onClearSelection();
  }

  function handleSnooze(until: string | null, wakeOnActivity: boolean) {
    bulkAction.mutate({
      issues: selectedIssues,
      action: "snooze",
      snoozedUntil: until || undefined,
      wakeOnActivity,
    });
    onClearSelection();
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <Badge variant="secondary" className="text-xs">
        {selectedIssues.length} selected
      </Badge>

      {/* Accept with priority + assign */}
      <Popover open={acceptOpen} onOpenChange={setAcceptOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" disabled={bulkAction.isPending}>
            <Check className="mr-1.5 size-3.5" />
            Accept
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1" align="start">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Set priority for all
          </p>
          {priorityValues.map((p) => (
            <button
              key={p}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleAccept(p)}
            >
              <IssuePriorityBadge priority={p} />
            </button>
          ))}
          <div className="border-t mt-1 pt-2 px-3 pb-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Assign</p>
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={assignToMe}
                onCheckedChange={(c) => setAssignToMe(c === true)}
              />
              <Avatar className="size-4">
                <AvatarImage src={`https://github.com/${myUsername}.png?size=16`} />
                <AvatarFallback className="text-[8px]">{myUsername?.[0]}</AvatarFallback>
              </Avatar>
              Me ({myUsername})
            </label>
            {favoriteTeammate && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={assignTeammate}
                  onCheckedChange={(c) => setAssignTeammate(c === true)}
                />
                <Avatar className="size-4">
                  <AvatarImage src={`https://github.com/${favoriteTeammate}.png?size=16`} />
                  <AvatarFallback className="text-[8px]">{favoriteTeammate[0]}</AvatarFallback>
                </Avatar>
                {favoriteTeammate}
              </label>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDecline}
        disabled={bulkAction.isPending}
      >
        <X className="mr-1.5 size-3.5" />
        Decline
      </Button>

      <SnoozePopover onSnooze={handleSnooze} disabled={bulkAction.isPending} />

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto text-xs"
        onClick={onClearSelection}
      >
        Clear
      </Button>
    </div>
  );
}

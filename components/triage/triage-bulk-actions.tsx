"use client";

import { useState } from "react";
import { Check, X, Tag, UserPlus } from "lucide-react";
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
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { toast } from "sonner";
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
  const updateIssue = useUpdateIssue();
  const { data: session } = useSession();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignToMe, setAssignToMe] = useState(true);
  const myUsername = session?.user?.githubUsername;

  const [favoriteTeammate] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gira-favorite-teammate");
  });
  const [assignTeammate, setAssignTeammate] = useState(false);

  if (selectedIssues.length === 0) return null;

  const isPending = bulkAction.isPending || updateIssue.isPending;

  function handleAccept() {
    const assignees: string[] = [];
    if (assignToMe && myUsername) assignees.push(myUsername);
    if (assignTeammate && favoriteTeammate) assignees.push(favoriteTeammate);

    bulkAction.mutate({
      issues: selectedIssues,
      action: "accept",
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

  function handleBulkPriority(priority: string) {
    for (const issue of selectedIssues) {
      const otherLabels = issue.labels
        .map((l) => l.name)
        .filter((l) => !l.startsWith("priority: "));
      updateIssue.mutate({
        owner: issue.repo.owner,
        repo: issue.repo.name,
        number: issue.number,
        updates: { labels: [...otherLabels, `priority: ${priority}`] },
      });
    }
    setPriorityOpen(false);
    toast.success(`Set ${selectedIssues.length} issues to ${priority}`);
  }

  function handleBulkAssign() {
    const assignees: string[] = [];
    if (assignToMe && myUsername) assignees.push(myUsername);
    if (assignTeammate && favoriteTeammate) assignees.push(favoriteTeammate);
    if (assignees.length === 0) return;

    for (const issue of selectedIssues) {
      updateIssue.mutate({
        owner: issue.repo.owner,
        repo: issue.repo.name,
        number: issue.number,
        updates: { assignees },
      });
    }
    setAssignOpen(false);
    toast.success(`Assigned ${selectedIssues.length} issues`);
  }

  const assignSection = (
    <div className="space-y-1.5">
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
  );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <Badge variant="secondary" className="text-xs">
        {selectedIssues.length} selected
      </Badge>

      {/* Bulk Set Priority */}
      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            <Tag className="mr-1.5 size-3.5" />
            Priority
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {priorityValues.map((p) => (
            <button
              key={p}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleBulkPriority(p)}
            >
              <IssuePriorityBadge priority={p} />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Bulk Set Assignee */}
      <Popover open={assignOpen} onOpenChange={setAssignOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={isPending}>
            <UserPlus className="mr-1.5 size-3.5" />
            Assign
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start">
          {assignSection}
          <Button size="sm" className="mt-2 w-full" onClick={handleBulkAssign}>
            Assign to selected
          </Button>
        </PopoverContent>
      </Popover>

      <Separator />

      {/* Accept (just marks as triaged) */}
      <Popover open={acceptOpen} onOpenChange={setAcceptOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" disabled={isPending}>
            <Check className="mr-1.5 size-3.5" />
            Accept
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start">
          <p className="text-xs text-muted-foreground mb-2">
            Accept selected issues into the backlog. Optionally assign:
          </p>
          {assignSection}
          <Button size="sm" className="mt-2 w-full" onClick={handleAccept}>
            Accept {selectedIssues.length} issue{selectedIssues.length !== 1 ? "s" : ""}
          </Button>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDecline}
        disabled={isPending}
      >
        <X className="mr-1.5 size-3.5" />
        Decline
      </Button>

      <SnoozePopover onSnooze={handleSnooze} disabled={isPending} />

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

function Separator() {
  return <div className="h-5 w-px bg-border" />;
}

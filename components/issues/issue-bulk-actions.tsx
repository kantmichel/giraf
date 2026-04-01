"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Tag, Zap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssueStatusBadge } from "./issue-status-badge";
import { IssuePriorityBadge } from "./issue-priority-badge";
import { IssueEffortBadge } from "./issue-effort-badge";
import { STATUS_LABELS, PRIORITY_LABELS, EFFORT_LABELS } from "@/lib/constants";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";

const statusValues = STATUS_LABELS.map((l) => l.name.replace("status: ", ""));
const priorityValues = PRIORITY_LABELS.map((l) => l.name.replace("priority: ", ""));
const effortValues = EFFORT_LABELS.map((l) => l.name.replace("effort: ", ""));

interface IssueBulkActionsProps {
  selectedIssues: NormalizedIssue[];
  onClearSelection: () => void;
}

export function IssueBulkActions({
  selectedIssues,
  onClearSelection,
}: IssueBulkActionsProps) {
  const updateIssue = useUpdateIssue();
  const { data: session } = useSession();
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignToMe, setAssignToMe] = useState(true);
  const myUsername = session?.user?.githubUsername;
  const [favoriteTeammate] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("gira-favorite-teammate");
  });
  const [assignTeammate, setAssignTeammate] = useState(false);

  if (selectedIssues.length === 0) return null;

  function bulkUpdateLabels(prefix: string, value: string) {
    for (const issue of selectedIssues) {
      const otherLabels = issue.labels.map((l) => l.name).filter((l) => !l.startsWith(prefix));
      updateIssue.mutate({
        owner: issue.repo.owner,
        repo: issue.repo.name,
        number: issue.number,
        updates: { labels: [...otherLabels, `${prefix}${value}`] },
      });
    }
    toast.success(`Updated ${selectedIssues.length} issues`);
  }

  function bulkAssign() {
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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
      <Badge variant="secondary" className="text-xs">
        {selectedIssues.length} selected
      </Badge>

      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm"><Tag className="mr-1.5 size-3.5" />Status</Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {statusValues.map((s) => (
            <button key={s} className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => { bulkUpdateLabels("status: ", s); setStatusOpen(false); }}>
              <IssueStatusBadge status={s} />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm"><Tag className="mr-1.5 size-3.5" />Priority</Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {priorityValues.map((p) => (
            <button key={p} className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => { bulkUpdateLabels("priority: ", p); setPriorityOpen(false); }}>
              <IssuePriorityBadge priority={p} />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover open={effortOpen} onOpenChange={setEffortOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm"><Zap className="mr-1.5 size-3.5" />Effort</Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {effortValues.map((e) => (
            <button key={e} className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => { bulkUpdateLabels("effort: ", e); setEffortOpen(false); }}>
              <IssueEffortBadge effort={e} />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover open={assignOpen} onOpenChange={setAssignOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm"><UserPlus className="mr-1.5 size-3.5" />Assign</Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={assignToMe} onCheckedChange={(c) => setAssignToMe(c === true)} />
              <Avatar className="size-4"><AvatarImage src={`https://github.com/${myUsername}.png?size=16`} /><AvatarFallback className="text-[8px]">{myUsername?.[0]}</AvatarFallback></Avatar>
              Me ({myUsername})
            </label>
            {favoriteTeammate && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox checked={assignTeammate} onCheckedChange={(c) => setAssignTeammate(c === true)} />
                <Avatar className="size-4"><AvatarImage src={`https://github.com/${favoriteTeammate}.png?size=16`} /><AvatarFallback className="text-[8px]">{favoriteTeammate[0]}</AvatarFallback></Avatar>
                {favoriteTeammate}
              </label>
            )}
          </div>
          <Button size="sm" className="mt-2 w-full" onClick={bulkAssign}>Assign to selected</Button>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={onClearSelection}>Clear</Button>
    </div>
  );
}

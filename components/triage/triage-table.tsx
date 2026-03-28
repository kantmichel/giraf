"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import type { NormalizedIssue } from "@/types/github";

interface TriageTableProps {
  issues: NormalizedIssue[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onIssueClick: (issue: NormalizedIssue) => void;
}

function issueKey(issue: NormalizedIssue): string {
  return `${issue.repo.fullName}:${issue.number}`;
}

export function TriageTable({
  issues,
  selectedIds,
  onSelectionChange,
  onIssueClick,
}: TriageTableProps) {
  const allSelected = issues.length > 0 && issues.every((i) => selectedIds.has(issueKey(i)));
  const someSelected = issues.some((i) => selectedIds.has(issueKey(i)));

  function handleSelectAll() {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(issues.map(issueKey)));
    }
  }

  function handleToggle(issue: NormalizedIssue) {
    const key = issueKey(issue);
    const next = new Set(selectedIds);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onSelectionChange(next);
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-32">Repo</TableHead>
            <TableHead className="w-24">Priority</TableHead>
            <TableHead className="w-28">Assignee</TableHead>
            <TableHead className="w-28">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No issues to triage.
              </TableCell>
            </TableRow>
          ) : (
            issues.map((issue) => {
              const key = issueKey(issue);
              return (
                <TableRow
                  key={issue.id}
                  className={selectedIds.has(key) ? "bg-accent/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(key)}
                      onCheckedChange={() => handleToggle(issue)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-left font-medium hover:underline line-clamp-1"
                      onClick={() => onIssueClick(issue)}
                    >
                      {issue.title}
                    </button>
                    <span className="text-xs text-muted-foreground ml-1">#{issue.number}</span>
                  </TableCell>
                  <TableCell>
                    <IssueRepoBadge repo={issue.repo.fullName} />
                  </TableCell>
                  <TableCell>
                    <IssuePriorityBadge priority={issue.priority} />
                  </TableCell>
                  <TableCell>
                    {issue.assignees.length > 0 ? (
                      <div className="flex -space-x-1.5">
                        {issue.assignees.slice(0, 3).map((a) => (
                          <Avatar key={a.id} className="size-6 border-2 border-background">
                            <AvatarImage src={a.avatarUrl} alt={a.login} />
                            <AvatarFallback className="text-[10px]">{a.login[0]}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RelativeTime date={issue.createdAt} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

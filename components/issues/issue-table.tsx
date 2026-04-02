"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, GitPullRequest, Tag } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueStatusEditor } from "./issue-status-editor";
import { IssuePriorityEditor } from "./issue-priority-editor";
import { IssueEffortEditor } from "./issue-effort-editor";
import { IssueAssigneesEditor } from "./issue-assignees-editor";
import { IssueLabelsEditor } from "./issue-labels-editor";
import { IssueRepoBadge } from "./issue-repo-badge";
import { IssueAiStatus } from "./issue-ai-status";
import { RelativeTime } from "@/components/shared/relative-time";
import { useUpdateIssue } from "@/hooks/use-issue-mutations";
import { useClaudeEnabledRepos } from "@/hooks/use-claude-repos";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";

type SortColumn =
  | "status"
  | "title"
  | "repo"
  | "priority"
  | "effort"
  | "assignee"
  | "createdAt"
  | "updatedAt"
  | "closedAt";

type SortDirection = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<string, number> = { doing: 0, "in review": 1, "to do": 2, done: 3 };
const EFFORT_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

function compareValues(a: NormalizedIssue, b: NormalizedIssue, column: SortColumn, direction: SortDirection): number {
  const dir = direction === "asc" ? 1 : -1;
  switch (column) {
    case "status": return ((a.status ? STATUS_RANK[a.status] ?? 99 : 99) - (b.status ? STATUS_RANK[b.status] ?? 99 : 99)) * dir;
    case "title": return a.title.localeCompare(b.title) * dir;
    case "repo": return a.repo.fullName.localeCompare(b.repo.fullName) * dir;
    case "priority": return ((a.priority ? PRIORITY_RANK[a.priority] ?? 99 : 99) - (b.priority ? PRIORITY_RANK[b.priority] ?? 99 : 99)) * dir;
    case "effort": return ((a.effort ? EFFORT_RANK[a.effort] ?? 99 : 99) - (b.effort ? EFFORT_RANK[b.effort] ?? 99 : 99)) * dir;
    case "assignee": return (a.assignees[0]?.login ?? "\uffff").localeCompare(b.assignees[0]?.login ?? "\uffff") * dir;
    case "createdAt": return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    case "updatedAt": return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    case "closedAt": return (new Date(a.closedAt ?? 0).getTime() - new Date(b.closedAt ?? 0).getTime()) * dir;
    default: return 0;
  }
}

function issueKey(issue: NormalizedIssue): string {
  return `${issue.repo.fullName}:${issue.number}`;
}

interface IssueTableProps {
  issues: NormalizedIssue[];
  isLoading: boolean;
  onIssueClick?: (issue: NormalizedIssue) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  showClosedColumn?: boolean;
}

export function IssueTable({
  issues,
  isLoading,
  onIssueClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  showClosedColumn = false,
}: IssueTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(showClosedColumn ? "closedAt" : "createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const updateIssue = useUpdateIssue();

  // Reset sort when switching between open/closed views
  useEffect(() => {
    setSortColumn(showClosedColumn ? "closedAt" : "createdAt");
    setSortDirection("desc");
  }, [showClosedColumn]);
  const { enabledSet: claudeEnabledRepos } = useClaudeEnabledRepos();

  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => compareValues(a, b, sortColumn, sortDirection));
  }, [issues, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function handleLabelsUpdate(issue: NormalizedIssue, labels: string[]) {
    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { labels },
    });
  }

  function handleAssigneesUpdate(issue: NormalizedIssue, assignees: string[]) {
    updateIssue.mutate({
      owner: issue.repo.owner,
      repo: issue.repo.name,
      number: issue.number,
      updates: { assignees },
    });
  }

  const allSelected = selectable && sortedIssues.length > 0 && sortedIssues.every((i) => selectedIds?.has(issueKey(i)));
  const someSelected = selectable && sortedIssues.some((i) => selectedIds?.has(issueKey(i)));

  function handleSelectAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sortedIssues.map(issueKey)));
    }
  }

  function handleToggleSelect(issue: NormalizedIssue) {
    if (!onSelectionChange || !selectedIds) return;
    const key = issueKey(issue);
    const next = new Set(selectedIds);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 size-3 opacity-30" />;
    return sortDirection === "asc" ? <ArrowUp className="ml-1 size-3" /> : <ArrowDown className="ml-1 size-3" />;
  }

  function SortableHead({ column, children, className }: { column: SortColumn; children: React.ReactNode; className?: string }) {
    return (
      <TableHead className={`cursor-pointer select-none ${className ?? ""}`} onClick={() => handleSort(column)}>
        <div className="flex items-center">{children}<SortIcon column={column} /></div>
      </TableHead>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  const colCount = (selectable ? 12 : 11) + (showClosedColumn ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <SortableHead column="status" className="w-24">Status</SortableHead>
            <SortableHead column="title" className="min-w-[200px]">Title</SortableHead>
            <SortableHead column="repo" className="w-32">Repo</SortableHead>
            <SortableHead column="priority" className="w-24">Priority</SortableHead>
            <SortableHead column="effort" className="w-24">Effort</SortableHead>
            <SortableHead column="assignee" className="w-28">Assignee</SortableHead>
            <TableHead className="w-28">Labels</TableHead>
            <TableHead className="w-24">Version</TableHead>
            <TableHead className="w-36">AI</TableHead>
            {showClosedColumn && (
              <SortableHead column="closedAt" className="w-28">Closed</SortableHead>
            )}
            <SortableHead column="createdAt" className="w-28">Created</SortableHead>
            <SortableHead column="updatedAt" className="w-28">Updated</SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedIssues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                No issues found.
              </TableCell>
            </TableRow>
          ) : (
            sortedIssues.map((issue) => {
              const labels = issue.labels.map((l) => l.name);
              return (
                <TableRow key={issue.id} className={selectedIds?.has(issueKey(issue)) ? "bg-accent/50" : ""}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds?.has(issueKey(issue)) ?? false}
                        onCheckedChange={() => handleToggleSelect(issue)}
                      />
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IssueStatusEditor
                      currentStatus={issue.status}
                      allLabels={labels}
                      onUpdate={(l) => handleLabelsUpdate(issue, l)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        className="text-left font-medium hover:underline line-clamp-1"
                        onClick={() => onIssueClick?.(issue)}
                      >
                        {issue.title}
                      </button>
                      <a
                        href={issue.htmlUrl}
                        target="_blank"
                        className="shrink-0 text-muted-foreground opacity-0 hover:opacity-100 group-hover:opacity-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(issue.htmlUrl)
                          toast.success("Link copied to clipboard")
                        }}
                        title="Copy link to clipboard"
                      >
                        #{issue.number}
                      </button>
                      {issue.linkedPrs.map((pr) => (
                        <a
                          key={pr.number}
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
                          title={pr.title}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GitPullRequest className="size-3" />
                          #{pr.number}
                        </a>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <IssueRepoBadge repo={issue.repo.fullName} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IssuePriorityEditor
                      currentPriority={issue.priority}
                      allLabels={labels}
                      onUpdate={(l) => handleLabelsUpdate(issue, l)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IssueEffortEditor
                      currentEffort={issue.effort}
                      allLabels={labels}
                      onUpdate={(l) => handleLabelsUpdate(issue, l)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IssueAssigneesEditor
                      owner={issue.repo.owner}
                      repo={issue.repo.name}
                      currentAssignees={issue.assignees}
                      onUpdate={(a) => handleAssigneesUpdate(issue, a)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IssueLabelsEditor
                      owner={issue.repo.owner}
                      repo={issue.repo.name}
                      currentLabels={labels}
                      onUpdate={(l) => handleLabelsUpdate(issue, l)}
                    />
                  </TableCell>
                  <TableCell>
                    {issue.version && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="size-3" />
                        {issue.version}
                      </span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <IssueAiStatus
                      issue={issue}
                      claudeEnabled={claudeEnabledRepos.has(issue.repo.fullName)}
                    />
                  </TableCell>
                  {showClosedColumn && (
                    <TableCell>
                      {issue.closedAt && <RelativeTime date={issue.closedAt} />}
                    </TableCell>
                  )}
                  <TableCell>
                    <RelativeTime date={issue.createdAt} />
                  </TableCell>
                  <TableCell>
                    <RelativeTime date={issue.updatedAt} />
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

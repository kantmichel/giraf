"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueStatusBadge } from "./issue-status-badge";
import { IssuePriorityBadge } from "./issue-priority-badge";
import { IssueEffortBadge } from "./issue-effort-badge";
import { IssueRepoBadge } from "./issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import type { NormalizedIssue } from "@/types/github";

type SortColumn =
  | "status"
  | "title"
  | "repo"
  | "priority"
  | "effort"
  | "assignee"
  | "createdAt"
  | "updatedAt";

type SortDirection = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_RANK: Record<string, number> = {
  doing: 0,
  "in review": 1,
  "to do": 2,
  done: 3,
};

function compareValues(
  a: NormalizedIssue,
  b: NormalizedIssue,
  column: SortColumn,
  direction: SortDirection
): number {
  const dir = direction === "asc" ? 1 : -1;

  switch (column) {
    case "status": {
      const ra = a.status ? (STATUS_RANK[a.status] ?? 99) : 99;
      const rb = b.status ? (STATUS_RANK[b.status] ?? 99) : 99;
      return (ra - rb) * dir;
    }
    case "title":
      return a.title.localeCompare(b.title) * dir;
    case "repo":
      return a.repo.fullName.localeCompare(b.repo.fullName) * dir;
    case "priority": {
      const ra = a.priority ? (PRIORITY_RANK[a.priority] ?? 99) : 99;
      const rb = b.priority ? (PRIORITY_RANK[b.priority] ?? 99) : 99;
      return (ra - rb) * dir;
    }
    case "assignee": {
      const la = a.assignees[0]?.login ?? "\uffff";
      const lb = b.assignees[0]?.login ?? "\uffff";
      return la.localeCompare(lb) * dir;
    }
    case "createdAt":
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    case "updatedAt":
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    case "effort": {
      const EFFORT_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };
      const ea = a.effort ? (EFFORT_RANK[a.effort] ?? 99) : 99;
      const eb = b.effort ? (EFFORT_RANK[b.effort] ?? 99) : 99;
      return (ea - eb) * dir;
    }
    default:
      return 0;
  }
}

interface IssueTableProps {
  issues: NormalizedIssue[];
  isLoading: boolean;
  onIssueClick?: (issue: NormalizedIssue) => void;
}

export function IssueTable({ issues, isLoading, onIssueClick }: IssueTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <ArrowUpDown className="ml-1 size-3 opacity-30" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 size-3" />
    ) : (
      <ArrowDown className="ml-1 size-3" />
    );
  }

  function SortableHead({ column, children, className }: { column: SortColumn; children: React.ReactNode; className?: string }) {
    return (
      <TableHead
        className={`cursor-pointer select-none ${className ?? ""}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center">
          {children}
          <SortIcon column={column} />
        </div>
      </TableHead>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <SortableHead column="status" className="w-24">Status</SortableHead>
            <SortableHead column="title" className="min-w-[200px]">Title</SortableHead>
            <SortableHead column="repo" className="w-40">Repo</SortableHead>
            <SortableHead column="priority" className="w-24">Priority</SortableHead>
            <SortableHead column="effort" className="w-24">Effort</SortableHead>
            <SortableHead column="assignee" className="w-28">Assignee</SortableHead>
            <TableHead className="w-40">Labels</TableHead>
            <SortableHead column="createdAt" className="w-28">Created</SortableHead>
            <SortableHead column="updatedAt" className="w-28">Updated</SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedIssues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No issues found.
              </TableCell>
            </TableRow>
          ) : (
            sortedIssues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell>
                  <IssueStatusBadge status={issue.status} />
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
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground opacity-0 hover:opacity-100 group-hover:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <span className="text-xs text-muted-foreground">#{issue.number}</span>
                </TableCell>
                <TableCell>
                  <IssueRepoBadge repo={issue.repo.fullName} />
                </TableCell>
                <TableCell>
                  <IssuePriorityBadge priority={issue.priority} />
                </TableCell>
                <TableCell>
                  <IssueEffortBadge effort={issue.effort} />
                </TableCell>
                <TableCell>
                  {issue.assignees.length > 0 ? (
                    <div className="flex -space-x-1.5">
                      {issue.assignees.slice(0, 3).map((a) => (
                        <Avatar key={a.id} className="size-6 border-2 border-background">
                          <AvatarImage src={a.avatarUrl} alt={a.login} />
                          <AvatarFallback className="text-[10px]">
                            {a.login[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {issue.assignees.length > 3 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          +{issue.assignees.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {issue.labels
                      .filter(
                        (l) =>
                          !l.name.startsWith("status: ") &&
                          !l.name.startsWith("priority: ")
                      )
                      .slice(0, 3)
                      .map((l) => (
                        <Badge
                          key={l.id}
                          variant="outline"
                          className="text-[10px] font-normal"
                          style={{
                            borderColor: `#${l.color}`,
                            color: `#${l.color}`,
                          }}
                        >
                          {l.name}
                        </Badge>
                      ))}
                  </div>
                </TableCell>
                <TableCell>
                  <RelativeTime date={issue.createdAt} />
                </TableCell>
                <TableCell>
                  <RelativeTime date={issue.updatedAt} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

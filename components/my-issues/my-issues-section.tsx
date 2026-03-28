"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MyIssueRow } from "./my-issue-row";
import type { NormalizedIssue } from "@/types/github";

interface MyIssuesSectionProps {
  title: string;
  issues: NormalizedIssue[];
  defaultOpen?: boolean;
  onIssueClick: (issue: NormalizedIssue) => void;
}

export function MyIssuesSection({
  title,
  issues,
  defaultOpen = true,
  onIssueClick,
}: MyIssuesSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        className="flex w-full items-center gap-2 py-2 text-left"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">({issues.length})</span>
      </button>
      {open && (
        <div className="ml-1">
          {issues.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No issues in this section.
            </p>
          ) : (
            issues.map((issue) => (
              <MyIssueRow
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick(issue)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

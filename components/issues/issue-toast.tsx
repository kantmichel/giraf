"use client";

import { toast } from "sonner";
import type { IssueRef } from "@/hooks/use-open-issue";

/** One toast per issue: a second change to the same issue replaces the first. */
function toastId(issue: IssueRef): string {
  return `issue:${issue.repo.name}#${issue.number}`;
}

function IssueLink({ issue, onOpen }: { issue: IssueRef; onOpen: (issue: IssueRef) => void }) {
  return (
    <button
      type="button"
      className="font-medium underline underline-offset-2 hover:text-primary"
      onClick={() => {
        toast.dismiss(toastId(issue));
        onOpen(issue);
      }}
    >
      {issue.repo.name} #{issue.number}
    </button>
  );
}

export function toastIssueUpdated(
  issue: IssueRef,
  title: string | undefined,
  onOpen: (issue: IssueRef) => void
) {
  toast.success(
    <span>
      <IssueLink issue={issue} onOpen={onOpen} /> updated
    </span>,
    {
      id: toastId(issue),
      description: title ? <span className="line-clamp-1">{title}</span> : undefined,
    }
  );
}

export function toastIssueUpdateFailed(
  issue: IssueRef,
  message: string,
  onOpen: (issue: IssueRef) => void
) {
  toast.error(
    <span>
      Couldn&apos;t update <IssueLink issue={issue} onOpen={onOpen} />
    </span>,
    { id: toastId(issue), description: message }
  );
}

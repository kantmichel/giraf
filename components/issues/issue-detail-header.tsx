import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueStatusBadge } from "./issue-status-badge";
import { IssueRepoBadge } from "./issue-repo-badge";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailHeaderProps {
  issue: NormalizedIssue;
  onClose?: () => void;
}

export function IssueDetailHeader({ issue, onClose }: IssueDetailHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-semibold leading-tight">{issue.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">#{issue.number}</span>
            <IssueStatusBadge status={issue.status} />
            <IssueRepoBadge repo={issue.repo.fullName} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" asChild>
            <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 size-3.5" />
              GitHub
            </a>
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IssueStatusBadge } from "./issue-status-badge";
import { IssueRepoBadge } from "./issue-repo-badge";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailHeaderProps {
  issue: NormalizedIssue;
}

export function IssueDetailHeader({ issue }: IssueDetailHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-tight">{issue.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">#{issue.number}</span>
            <IssueStatusBadge status={issue.status} />
            <IssueRepoBadge repo={issue.repo.fullName} />
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={issue.htmlUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1.5 size-3.5" />
            GitHub
          </a>
        </Button>
      </div>
    </div>
  );
}

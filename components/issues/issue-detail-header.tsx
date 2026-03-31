"use client";

import { useState } from "react";
import { ExternalLink, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IssueStatusBadge } from "./issue-status-badge";
import { IssueRepoBadge } from "./issue-repo-badge";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailHeaderProps {
  issue: NormalizedIssue;
  onClose?: () => void;
}

export function IssueDetailHeader({ issue, onClose }: IssueDetailHeaderProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const repoName = issue.repo.name;
    const text = `${repoName} - ${issue.number} - ${issue.title}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                {copied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Copy metadata</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" asChild>
            <a href={issue.htmlUrl} target="_blank">
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

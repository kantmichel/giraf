"use client";

import { MessageSquare, ExternalLink } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { RelativeTime } from "@/components/shared/relative-time";
import { useIssueDetail } from "@/hooks/use-issue-detail";
import type { NormalizedIssue } from "@/types/github";

interface IssueDetailBodyProps {
  issue: NormalizedIssue;
}

export function IssueDetailBody({ issue }: IssueDetailBodyProps) {
  const { comments, isLoading } = useIssueDetail(
    issue.repo.owner,
    issue.repo.name,
    issue.number
  );

  return (
    <div className="space-y-4">
      {issue.body ? (
        <MarkdownRenderer content={issue.body} />
      ) : (
        <p className="text-sm italic text-muted-foreground">No description provided.</p>
      )}

      <Separator />

      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Comments {!isLoading && `(${comments.length})`}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={comment.user.avatarUrl} alt={comment.user.login} />
                <AvatarFallback className="text-[10px]">
                  {comment.user.login[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.user.login}</span>
                  <RelativeTime date={comment.createdAt} />
                </div>
                <div className="mt-1">
                  <MarkdownRenderer content={comment.body} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" asChild>
        <a
          href={`${issue.htmlUrl}#issuecomment-new`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-1.5 size-3.5" />
          Reply on GitHub
        </a>
      </Button>
    </div>
  );
}

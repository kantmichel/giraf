"use client";

import { AtSign, AlertTriangle, ExternalLink, GitPullRequest, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { useMentions } from "@/hooks/use-mentions";

export default function MentionsPage() {
  const { mentions, isLoading, isError, refetch } = useMentions();

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="mt-3 text-sm font-medium">Failed to load mentions</p>
        <Button size="sm" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AtSign className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Mentions</h1>
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {mentions.length} across your tracked repos
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : mentions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <AtSign className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No mentions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Issues and pull requests that tag you will show up here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="min-w-[240px]">Title</TableHead>
                <TableHead className="w-32">Repo</TableHead>
                <TableHead className="w-20">State</TableHead>
                <TableHead className="w-32">Author</TableHead>
                <TableHead className="w-28">Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentions.map((m) => (
                <TableRow key={`${m.repoFullName}#${m.number}`}>
                  <TableCell className="text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {m.type === "pull" ? (
                          <GitPullRequest className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <span className="text-xs">
                          {m.type === "pull" ? "Pull request" : "Issue"}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <a
                      href={m.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline"
                    >
                      {m.title}
                    </a>
                  </TableCell>
                  <TableCell>
                    <IssueRepoBadge repo={m.repoFullName} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        m.state === "open"
                          ? "text-xs font-medium text-green-600 dark:text-green-400"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {m.state}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.author}
                  </TableCell>
                  <TableCell>
                    <RelativeTime date={m.updatedAt} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a href={m.htmlUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import { Trash2, GitFork } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import { useTrackedRepos, useRemoveTrackedRepo } from "@/hooks/use-tracked-repos";

export function TrackedReposList() {
  const { data: repos, isLoading } = useTrackedRepos();
  const removeMutation = useRemoveTrackedRepo();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <GitFork className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No repos tracked yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add your first repository to start managing issues.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {repos.map((repo) => (
            <TableRow key={repo.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <img
                    src={`https://github.com/${repo.owner}.png?size=24`}
                    alt={repo.owner}
                    className="size-6 rounded-full"
                  />
                  <a
                    href={`https://github.com/${repo.owner}/${repo.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {repo.owner}/{repo.repo}
                  </a>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(repo.added_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    removeMutation.mutate({ owner: repo.owner, repo: repo.repo })
                  }
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

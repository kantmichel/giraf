"use client";

import { Loader2, Lock, Globe } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { GitHubRepo } from "@/types/github";

interface RepoRowProps {
  repo: GitHubRepo;
  isTracked: boolean;
  isPending: boolean;
  onToggle: () => void;
}

export function RepoRow({ repo, isTracked, isPending, onToggle }: RepoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
      <div className="flex items-center">
        {isPending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <Checkbox
            checked={isTracked}
            onCheckedChange={onToggle}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{repo.name}</span>
          {repo.isPrivate ? (
            <Lock className="size-3 text-muted-foreground" />
          ) : (
            <Globe className="size-3 text-muted-foreground" />
          )}
        </div>
        {repo.description && (
          <p className="truncate text-xs text-muted-foreground">
            {repo.description}
          </p>
        )}
      </div>
      {repo.language && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {repo.language}
        </Badge>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useGitHubRepos } from "@/hooks/use-github-repos";
import {
  useTrackedRepos,
  useAddTrackedRepo,
  useRemoveTrackedRepo,
} from "@/hooks/use-tracked-repos";
import { RepoRow } from "./repo-row";

export function RepoAddDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const { data: githubRepos, isLoading } = useGitHubRepos();
  const { data: trackedRepos } = useTrackedRepos();
  const addMutation = useAddTrackedRepo();
  const removeMutation = useRemoveTrackedRepo();

  const trackedSet = useMemo(() => {
    const set = new Set<string>();
    trackedRepos?.forEach((r) => set.add(`${r.owner}/${r.repo}`));
    return set;
  }, [trackedRepos]);

  // Initialize selection from tracked repos when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setSelected(new Set(trackedSet));
        setSearch("");
      }
      setOpen(isOpen);
    },
    [trackedSet]
  );

  const grouped = useMemo(() => {
    if (!githubRepos) return {};
    const filtered = search
      ? githubRepos.filter(
          (r) =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.fullName.toLowerCase().includes(search.toLowerCase())
        )
      : githubRepos;

    const groups: Record<string, typeof filtered> = {};
    for (const repo of filtered) {
      const key = repo.owner.login;
      if (!groups[key]) groups[key] = [];
      groups[key].push(repo);
    }
    return groups;
  }, [githubRepos, search]);

  function handleToggle(owner: string, repo: string) {
    const key = `${owner}/${repo}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Compute diff between current tracked and selected
  const toAdd = useMemo(
    () => [...selected].filter((key) => !trackedSet.has(key)),
    [selected, trackedSet]
  );
  const toRemove = useMemo(
    () => [...trackedSet].filter((key) => !selected.has(key)),
    [selected, trackedSet]
  );
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  async function handleSave() {
    setIsSaving(true);
    try {
      // Process adds and removes sequentially to avoid race conditions
      for (const key of toAdd) {
        const [owner, repo] = key.split("/");
        await addMutation.mutateAsync({ owner, repo });
      }
      for (const key of toRemove) {
        const [owner, repo] = key.split("/");
        await removeMutation.mutateAsync({ owner, repo });
      }
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  const changeCount = toAdd.length + toRemove.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Repository
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Repositories</DialogTitle>
          <DialogDescription>
            Select repositories to track in Gira. Status and priority labels
            will be created automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Filter repositories..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="size-4" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {Object.entries(grouped).map(([owner, repos]) => (
                <div key={owner} className="mb-4">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <img
                      src={`https://github.com/${owner}.png?size=20`}
                      alt={owner}
                      className="size-5 rounded-full"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {owner}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({repos.length})
                    </span>
                  </div>
                  {repos.map((repo) => {
                    const key = `${repo.owner.login}/${repo.name}`;
                    return (
                      <RepoRow
                        key={repo.id}
                        repo={repo}
                        isTracked={selected.has(key)}
                        isPending={false}
                        onToggle={() =>
                          handleToggle(repo.owner.login, repo.name)
                        }
                      />
                    );
                  })}
                </div>
              ))}
              {!isLoading && Object.keys(grouped).length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No repositories found.
                </p>
              )}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : hasChanges ? (
              `Save changes (${changeCount})`
            ) : (
              "No changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

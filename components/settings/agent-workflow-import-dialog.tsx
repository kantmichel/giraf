"use client";

import { useEffect } from "react";
import { Check, Loader2, Plus, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDiscoverWorkflows,
  useImportWorkflow,
} from "@/hooks/use-imported-workflows";

interface AgentWorkflowImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentWorkflowImportDialog({
  open,
  onOpenChange,
}: AgentWorkflowImportDialogProps) {
  const discover = useDiscoverWorkflows();
  const importMutation = useImportWorkflow();

  useEffect(() => {
    if (open) {
      discover.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleImport(
    owner: string,
    repo: string,
    workflowId: number,
    name: string
  ) {
    try {
      await importMutation.mutateAsync({ owner, repo, workflowId });
      toast.success(`Imported "${name}"`);
      discover.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Discover workflows</DialogTitle>
          <DialogDescription>
            Select workflows from your tracked repos to track them on the Agents
            dashboard. Each import fetches the YAML and extracts stages +
            schedule.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-4 pr-3">
            {discover.isFetching && !discover.data ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : discover.data?.groups.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Workflow className="size-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No active workflows found in any tracked repo.
                </p>
              </div>
            ) : (
              discover.data?.groups.map((group) => (
                <div key={`${group.repo.owner}/${group.repo.name}`}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.repo.owner}/{group.repo.name}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.workflows.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center gap-3 rounded-md border p-2.5"
                      >
                        <Workflow className="size-4 shrink-0 text-muted-foreground" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {w.name}
                          </span>
                          <span className="truncate font-mono text-[11px] text-muted-foreground">
                            {w.path}
                          </span>
                        </div>
                        <div className="ml-auto shrink-0">
                          {w.alreadyImported ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                              className="gap-1 text-xs"
                            >
                              <Check className="size-3.5" />
                              Imported
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              disabled={importMutation.isPending}
                              onClick={() =>
                                handleImport(
                                  group.repo.owner,
                                  group.repo.name,
                                  w.id,
                                  w.name
                                )
                              }
                            >
                              {importMutation.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Plus className="size-3.5" />
                              )}
                              Import
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

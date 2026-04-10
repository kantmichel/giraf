"use client";

import { useState } from "react";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { AgentPipelineRail } from "@/components/agents/agent-pipeline-rail";
import { humanizeCron } from "@/lib/agents/compute-schedule";
import {
  useDeleteImportedWorkflow,
  useUpdateImportedWorkflow,
} from "@/hooks/use-imported-workflows";
import type { AgentStage, ImportedWorkflow } from "@/types/agents";
import { AgentWorkflowEditDialog } from "./agent-workflow-edit-dialog";

interface AgentWorkflowRowProps {
  workflow: ImportedWorkflow;
}

export function AgentWorkflowRow({ workflow }: AgentWorkflowRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const updateMutation = useUpdateImportedWorkflow();
  const deleteMutation = useDeleteImportedWorkflow();

  const displayName = workflow.displayName ?? workflow.workflow.name;
  const scheduleLabel =
    workflow.scheduleCrons.length > 0
      ? humanizeCron(workflow.scheduleCrons[0])
      : null;

  const previewStages: AgentStage[] = workflow.stages.map((def) => ({
    def,
    status: "pending",
  }));

  async function handleToggle(checked: boolean) {
    try {
      await updateMutation.mutateAsync({ id: workflow.id, enabled: checked });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function handleRefresh() {
    try {
      await updateMutation.mutateAsync({ id: workflow.id, refresh: true });
      toast.success(`Re-parsed ${displayName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refresh");
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${displayName}" from imported workflows?`)) return;
    try {
      await deleteMutation.mutateAsync(workflow.id);
      toast.success(`Removed ${displayName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 rounded-md border p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">{displayName}</span>
              {scheduleLabel && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {scheduleLabel}
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {workflow.repo.owner}/{workflow.repo.name} ·{" "}
              <span className="font-mono">{workflow.workflow.path}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Switch
              checked={workflow.enabled}
              onCheckedChange={handleToggle}
              aria-label="Toggle enabled"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-3.5" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefresh}>
                  <RefreshCw className="mr-2 size-3.5" />
                  Re-parse YAML
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`https://github.com/${workflow.repo.owner}/${workflow.repo.name}/blob/main/${workflow.workflow.path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-2 size-3.5" />
                    View on GitHub
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {previewStages.length > 0 && (
          <AgentPipelineRail stages={previewStages} showCodes />
        )}
      </div>
      <AgentWorkflowEditDialog
        workflow={workflow}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

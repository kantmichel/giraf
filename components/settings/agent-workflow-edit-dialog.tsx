"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateImportedWorkflow } from "@/hooks/use-imported-workflows";
import type { ImportedWorkflow } from "@/types/agents";

interface AgentWorkflowEditDialogProps {
  workflow: ImportedWorkflow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentWorkflowEditDialog({
  workflow,
  open,
  onOpenChange,
}: AgentWorkflowEditDialogProps) {
  const [displayName, setDisplayName] = useState(
    workflow.displayName ?? workflow.workflow.name
  );
  const [description, setDescription] = useState(workflow.description ?? "");
  const mutation = useUpdateImportedWorkflow();

  async function handleSave() {
    try {
      await mutation.mutateAsync({
        id: workflow.id,
        displayName: displayName || null,
        description: description || null,
      });
      toast.success("Saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit workflow</DialogTitle>
          <DialogDescription>
            Customise the display name and description shown on the Agents
            dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="display-name" className="text-xs">
              Display name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-xs">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

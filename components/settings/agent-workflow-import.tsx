"use client";

import { useState } from "react";
import { Plus, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useImportedWorkflows } from "@/hooks/use-imported-workflows";
import { AgentWorkflowRow } from "./agent-workflow-row";
import { AgentWorkflowImportDialog } from "./agent-workflow-import-dialog";

export function AgentWorkflowImport() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = useImportedWorkflows();
  const imported = data?.imported ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Workflow className="size-5" />
          Agent workflows
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Import GitHub Actions workflows from your tracked repos so they
          appear on the Agents dashboard. Stage order + schedule are extracted
          from each workflow&apos;s YAML.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : imported.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-8 text-center">
            <Workflow className="size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No workflows imported yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {imported.map((w) => (
              <AgentWorkflowRow key={w.id} workflow={w} />
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="size-3.5" />
          Scan tracked repos for workflows
        </Button>
      </CardContent>
      <AgentWorkflowImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}

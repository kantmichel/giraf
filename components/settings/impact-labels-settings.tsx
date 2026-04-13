"use client";

import { useState } from "react";
import { Zap, Plus, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useImpactLabels, useSyncImpactLabel } from "@/hooks/use-impact-labels";

const DEFAULT_NEW_COLOR = "7057ff";

export function ImpactLabelsSettings() {
  const { data, isLoading } = useImpactLabels();
  const sync = useSyncImpactLabel();

  const [newType, setNewType] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_NEW_COLOR);

  const totalRepos = data?.totalRepos ?? 0;
  const labels = data?.labels ?? [];

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newType.trim()) return;
    sync.mutate(
      { type: newType.trim().toLowerCase(), color: newColor },
      {
        onSuccess: () => {
          setNewType("");
          setNewColor(DEFAULT_NEW_COLOR);
        },
      }
    );
  }

  function handleSyncMissing(label: { type: string; color: string; description: string | null }) {
    sync.mutate({
      type: label.type,
      color: label.color,
      description: label.description ?? undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="size-4" />
          Impact labels
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tag issues with <code className="rounded bg-muted px-1 text-xs">impact: &lt;type&gt;</code>{" "}
          to boost their WSJF score by 1.5× per label (capped at 3×). Labels are discovered across
          all tracked repos and can be synced to repos that are missing them.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Discovered labels list */}
        <div>
          <Label className="text-xs text-muted-foreground">
            Discovered labels {totalRepos > 0 && `(across ${totalRepos} repo${totalRepos === 1 ? "" : "s"})`}
          </Label>
          <div className="mt-2 space-y-1.5">
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </>
            ) : labels.length === 0 ? (
              <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                No impact labels found. Add one below.
              </p>
            ) : (
              labels.map((label) => {
                const present = label.presentIn.length;
                const missing = label.missingIn.length;
                const partial = missing > 0 && present > 0;
                return (
                  <div
                    key={label.name}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: `#${label.color}` }}
                    />
                    <span className="font-mono text-sm">{label.name}</span>
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      {partial && <AlertCircle className="size-3.5 text-amber-500" />}
                      <span>
                        {present}/{totalRepos} repos
                      </span>
                      {missing > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7"
                          disabled={sync.isPending}
                          onClick={() => handleSyncMissing(label)}
                          title={`Create in: ${label.missingIn.join(", ")}`}
                        >
                          <RefreshCw className="mr-1 size-3" />
                          Sync to {missing}
                        </Button>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add new */}
        <form onSubmit={handleAdd} className="space-y-2">
          <Label className="text-xs text-muted-foreground">Add a new impact label</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">impact:</span>
            <Input
              placeholder="customer"
              value={newType}
              onChange={(e) => setNewType(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="h-8 flex-1 font-mono"
              disabled={sync.isPending}
            />
            <div className="flex items-center gap-1.5">
              <span
                className="size-5 rounded border"
                style={{ backgroundColor: `#${newColor}` }}
              />
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value.replace(/^#/, "").toLowerCase())}
                className="h-8 w-24 font-mono text-xs"
                placeholder="7057ff"
                maxLength={6}
                disabled={sync.isPending}
              />
            </div>
            <Button type="submit" size="sm" disabled={sync.isPending || !newType.trim()}>
              <Plus className="mr-1 size-3.5" />
              Add to all repos
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens. The label is created in every tracked repo
            that doesn&apos;t already have it.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

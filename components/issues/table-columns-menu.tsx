"use client";

import { useState } from "react";
import { Columns3, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  TABLE_COLUMN_DEFS,
  defaultTableColumnVisibility,
} from "./issue-table";

interface TableColumnsMenuProps {
  /** Currently active visibility map (drives the live view). */
  value: Record<string, boolean>;
  /** Called when a checkbox changes — applies immediately to the live view. */
  onChange: (next: Record<string, boolean>) => void;
  /** Called when the user clicks Save view to persist the current value. */
  onSave: () => void;
  /** True while a save is in flight (disables the button). */
  isSaving?: boolean;
  /** True when the live `value` differs from what's saved on the server. */
  hasUnsavedChanges?: boolean;
}

export function TableColumnsMenu({
  value,
  onChange,
  onSave,
  isSaving,
  hasUnsavedChanges,
}: TableColumnsMenuProps) {
  const [open, setOpen] = useState(false);

  const visibleCount = TABLE_COLUMN_DEFS.filter((c) => value[c.id] !== false).length;
  const totalCount = TABLE_COLUMN_DEFS.length;
  const allVisible = visibleCount === totalCount;

  function toggle(id: string) {
    onChange({ ...value, [id]: value[id] === false });
  }

  function reset() {
    onChange(defaultTableColumnVisibility());
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="size-4" />
          Columns
          {!allVisible && (
            <span className="text-xs text-muted-foreground">
              ({visibleCount}/{totalCount})
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="px-1 pb-1.5">
          <Label className="text-xs font-medium">Visible columns</Label>
        </div>
        <div className="space-y-0.5">
          {TABLE_COLUMN_DEFS.map((col) => {
            const checked = value[col.id] !== false;
            return (
              <label
                key={col.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(col.id)}
                />
                <span className="text-sm">{col.label}</span>
              </label>
            );
          })}
        </div>
        <Separator className="my-2" />
        <div className="flex items-center justify-between gap-1 px-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={reset}
            disabled={allVisible}
          >
            <RotateCcw className="mr-1 size-3" />
            Reset
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => {
              onSave();
              setOpen(false);
            }}
            disabled={isSaving || !hasUnsavedChanges}
          >
            <Save className="mr-1 size-3" />
            Save view
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

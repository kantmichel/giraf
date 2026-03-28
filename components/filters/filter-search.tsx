"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FilterSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function FilterSearch({ value, onChange }: FilterSearchProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) {
        onChange(local);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [local, value, onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search issues..."
        className="h-8 w-48 pl-8 text-xs"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      {local && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-5"
          onClick={() => {
            setLocal("");
            onChange("");
          }}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}

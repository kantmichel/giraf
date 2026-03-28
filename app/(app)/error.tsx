"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <AlertTriangle className="size-8 text-destructive" />
      <p className="mt-3 text-sm font-medium">Something went wrong</p>
      <p className="mt-1 max-w-md text-center text-xs text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button size="sm" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

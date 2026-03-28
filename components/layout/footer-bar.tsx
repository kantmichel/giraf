"use client";

import { useRateLimit } from "@/hooks/use-rate-limit";
import { cn } from "@/lib/utils";

export function FooterBar() {
  const { data: rateLimit } = useRateLimit();

  const remaining = rateLimit?.remaining;
  const limit = rateLimit?.limit;

  const rateLimitColor =
    remaining === undefined
      ? ""
      : remaining > 1000
        ? "text-green-600 dark:text-green-400"
        : remaining > 100
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-red-600 dark:text-red-400";

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          Rate limit:{" "}
          <span className={cn(rateLimitColor)}>
            {remaining ?? "—"} / {limit ?? "5000"}
          </span>
        </span>
      </div>
      <span>Gira v0.1.0</span>
    </footer>
  );
}

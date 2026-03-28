"use client";

import { RefreshCw } from "lucide-react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useRateLimit } from "@/hooks/use-rate-limit";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export function FooterBar() {
  const { data: rateLimit, dataUpdatedAt } = useRateLimit();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const [now, setNow] = useState(Date.now());

  // Update "last synced" every 10s
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

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

  const lastSynced = dataUpdatedAt
    ? formatDistanceToNow(dataUpdatedAt, { addSuffix: true })
    : "—";

  // Suppress unused variable warning — now is used to trigger re-render
  void now;

  function handleRefresh() {
    queryClient.invalidateQueries();
  }

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between border-t px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          Rate limit:{" "}
          <span className={cn(rateLimitColor)}>
            {remaining ?? "—"} / {limit ?? "5000"}
          </span>
        </span>
        <span>Synced {lastSynced}</span>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-5"
              onClick={handleRefresh}
            >
              <RefreshCw
                className={cn("size-3", isFetching > 0 && "animate-spin")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Refresh all data</TooltipContent>
        </Tooltip>
        <span>Giraf v0.1.0</span>
      </div>
    </footer>
  );
}

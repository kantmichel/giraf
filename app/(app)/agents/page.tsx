"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentsControlRoom } from "@/components/agents/agents-control-room";

function AgentsContent() {
  return <AgentsControlRoom />;
}

export default function AgentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      }
    >
      <AgentsContent />
    </Suspense>
  );
}

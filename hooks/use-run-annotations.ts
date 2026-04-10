"use client";

import { useQuery } from "@tanstack/react-query";
import type { WorkflowRunAnnotation } from "@/lib/github/workflow-runs";

export function useRunAnnotations(
  runId: number | null,
  enabled: boolean
) {
  return useQuery<{ annotations: WorkflowRunAnnotation[] }>({
    queryKey: ["agents", "run-annotations", runId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/runs/${runId}/annotations`);
      if (!res.ok) throw new Error("Failed to load annotations");
      return res.json();
    },
    enabled: enabled && runId !== null,
    staleTime: 60_000,
  });
}

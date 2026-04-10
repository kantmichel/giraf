"use client";

import { useQuery } from "@tanstack/react-query";
import type { AgentPr, AgentPrSummary } from "@/types/agents";

interface AgentPrsResponse {
  prs: AgentPr[];
  summary: AgentPrSummary;
}

export function useAgentPrs() {
  return useQuery<AgentPrsResponse>({
    queryKey: ["agents", "prs"],
    queryFn: async () => {
      const res = await fetch("/api/agents/prs");
      if (!res.ok) throw new Error("Failed to load agent PRs");
      return res.json();
    },
    staleTime: 90_000,
    refetchInterval: 180_000,
  });
}

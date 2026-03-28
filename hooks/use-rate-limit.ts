"use client";

import { useQuery } from "@tanstack/react-query";
import type { RateLimitInfo } from "@/types/github";

export function useRateLimit() {
  return useQuery<RateLimitInfo>({
    queryKey: ["github", "rate-limit"],
    queryFn: async () => {
      const res = await fetch("/api/github/rate-limit");
      if (!res.ok) throw new Error("Failed to fetch rate limit");
      return res.json();
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });
}

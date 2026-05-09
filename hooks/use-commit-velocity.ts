"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  CommitVelocityBucketSize,
  CommitVelocityResponse,
} from "@/types/github";

interface Args {
  owner: string;
  repo: string;
  fromIso?: string;
  toIso?: string;
  bucket?: CommitVelocityBucketSize;
  excludeMerges?: boolean;
  enabled?: boolean;
}

export function useCommitVelocity({
  owner,
  repo,
  fromIso,
  toIso,
  bucket,
  excludeMerges,
  enabled = true,
}: Args) {
  return useQuery<CommitVelocityResponse>({
    queryKey: [
      "commit-velocity",
      owner,
      repo,
      fromIso ?? null,
      toIso ?? null,
      bucket ?? null,
      excludeMerges ? 1 : 0,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ owner, repo });
      if (fromIso) params.set("from", fromIso);
      if (toIso) params.set("to", toIso);
      if (bucket) params.set("bucket", bucket);
      if (excludeMerges) params.set("excludeMerges", "1");
      const res = await fetch(`/api/metrics/commit-velocity?${params}`);
      if (!res.ok) throw new Error("Failed to fetch commit velocity");
      return res.json();
    },
    enabled: enabled && !!owner && !!repo,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const inProgress =
        data.syncStatus.seriesA.inProgress ||
        data.syncStatus.seriesB.inProgress;
      return inProgress ? 5000 : false;
    },
    staleTime: 60_000,
  });
}

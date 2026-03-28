"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { NormalizedIssue } from "@/types/github";
import type { PriorityPromotion } from "@/lib/db/priority-promotions";

interface PriorityReviewData {
  promotions: PriorityPromotion[];
  budget: { critical_max: number; high_max: number; medium_max: number };
  counts: { critical: number; high: number; medium: number; low: number };
  overBudget: { critical: number; high: number; medium: number };
  staleIssues: NormalizedIssue[];
  forUser: string;
}

export function usePriorityReview(user?: string) {
  return useQuery<PriorityReviewData>({
    queryKey: ["priority-review", user],
    queryFn: async () => {
      const params = user ? `?user=${user}` : "";
      const res = await fetch(`/api/priority/review${params}`);
      if (!res.ok) throw new Error("Failed to fetch priority review");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUndoPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotionId: number) => {
      const res = await fetch(`/api/priority/promotions/${promotionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to undo promotion");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-review"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["my-issues"] });
      toast.success("Promotion reverted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

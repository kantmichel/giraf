"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  DiscoveredWorkflowGroup,
  ImportedWorkflow,
} from "@/types/agents";

export function useImportedWorkflows() {
  return useQuery<{ imported: ImportedWorkflow[] }>({
    queryKey: ["agents", "imported-workflows"],
    queryFn: async () => {
      const res = await fetch("/api/agents/workflows");
      if (!res.ok) throw new Error("Failed to load imported workflows");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useDiscoverWorkflows() {
  return useQuery<{ groups: DiscoveredWorkflowGroup[] }>({
    queryKey: ["agents", "discover-workflows"],
    queryFn: async () => {
      const res = await fetch("/api/agents/workflows/discover");
      if (!res.ok) throw new Error("Failed to discover workflows");
      return res.json();
    },
    enabled: false,
  });
}

export function useImportWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      owner: string;
      repo: string;
      workflowId: number;
    }) => {
      const res = await fetch("/api/agents/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Import failed");
      }
      return res.json() as Promise<{
        imported: ImportedWorkflow;
        alreadyImported: boolean;
      }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useUpdateImportedWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: number;
      displayName?: string | null;
      description?: string | null;
      enabled?: boolean;
      refresh?: boolean;
    }) => {
      const { id, ...patch } = input;
      const res = await fetch(`/api/agents/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Update failed");
      }
      return res.json() as Promise<{ imported: ImportedWorkflow }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useDeleteImportedWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/agents/workflows/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClosedNotificationRow } from "@/lib/db/notifications";

interface NotificationsResponse {
  notifications: ClosedNotificationRow[];
  unreadCount: number;
}

export function useNotifications() {
  const query = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    staleTime: 30_000,
  });

  return {
    ...query,
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
  };
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark notifications as read");
      return res.json();
    },
    onMutate: () => {
      // Optimistic: clear notifications immediately
      queryClient.setQueryData<NotificationsResponse>(["notifications"], (old) =>
        old ? { notifications: [], unreadCount: 0 } : old
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

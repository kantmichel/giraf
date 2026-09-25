"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClosedNotificationRow } from "@/lib/db/notifications";

export interface MentionNotification {
  id: string;
  title: string;
  repoFullName: string;
  type: "issue" | "pull";
  number: number;
  htmlUrl: string;
  isComment: boolean;
  updatedAt: string;
  read: boolean;
}

interface NotificationsResponse {
  notifications: ClosedNotificationRow[];
  unreadCount: number;
  mentions: MentionNotification[];
  mentionUnreadCount: number;
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
    mentions: query.data?.mentions ?? [],
    mentionUnreadCount: query.data?.mentionUnreadCount ?? 0,
  };
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mentionIds: string[] = []) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentionIds }),
      });
      if (!res.ok) throw new Error("Failed to mark notifications as read");
      return res.json();
    },
    onMutate: (mentionIds: string[] = []) => {
      // Optimistic: clear the badge immediately. Mentions stay in the list —
      // they are still worth reading after the count clears.
      queryClient.setQueryData<NotificationsResponse>(["notifications"], (old) =>
        old
          ? {
              ...old,
              notifications: [],
              unreadCount: 0,
              mentions: old.mentions.map((m) =>
                mentionIds.includes(m.id) ? { ...m, read: true } : m
              ),
              mentionUnreadCount: 0,
            }
          : old
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

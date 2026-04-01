"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount } = useNotifications();
  const markRead = useMarkNotificationsRead();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && unreadCount > 0) {
      markRead.mutate();
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full border-0 bg-indigo-500 p-0 text-[10px] font-semibold text-white shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
        </div>
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <a
                key={n.id}
                href={n.issue_html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 border-b px-3 py-2.5 transition-colors last:border-0 hover:bg-accent"
              >
                <span className="line-clamp-1 text-sm font-medium">
                  {n.issue_title}
                </span>
                <div className="flex items-center gap-2">
                  <IssueRepoBadge repo={n.repo_full_name} />
                  <span className="text-xs text-muted-foreground">
                    closed <RelativeTime date={n.closed_at} />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useState } from "react";
import { AtSign, Bell, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/use-notifications";
import type { MentionNotification } from "@/hooks/use-notifications";
import { toast } from "sonner";

function MentionRow({ mention }: { mention: MentionNotification }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(mention.htmlUrl);
    setCopied(true);
    toast.success(mention.isComment ? "Comment link copied" : "Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`flex items-start gap-2 border-b px-3 py-2.5 transition-colors last:border-0 hover:bg-accent ${
        mention.read ? "opacity-60" : ""
      }`}
    >
      <AtSign className="mt-0.5 size-3.5 shrink-0 text-indigo-500" />
      <div className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-medium">{mention.title}</span>
        <div className="mt-1 flex items-center gap-2">
          <IssueRepoBadge repo={mention.repoFullName} />
          <span className="text-xs text-muted-foreground">
            #{mention.number} · <RelativeTime date={mention.updatedAt} />
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={copyLink}>
              {copied ? (
                <Check className="size-3.5 text-green-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">
              {/* GitHub only gives a comment anchor when the mention was in a
                  comment; a mention in the body links to the thread. */}
              {mention.isComment ? "Copy link to comment" : "Copy link to thread"}
            </span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <a href={mention.htmlUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">Open on GitHub</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, mentions, mentionUnreadCount } =
    useNotifications();
  const markRead = useMarkNotificationsRead();

  const totalUnread = unreadCount + mentionUnreadCount;

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && totalUnread > 0) {
      markRead.mutate(mentions.filter((m) => !m.read).map((m) => m.id));
    }
  }

  const isEmpty = notifications.length === 0 && mentions.length === 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {totalUnread > 0 && (
            <Badge className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full border-0 bg-indigo-500 p-0 text-[10px] font-semibold text-white shadow-sm">
              {totalUnread > 9 ? "9+" : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
        </div>
        {isEmpty ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {mentions.length > 0 && (
              <>
                <div className="bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Mentions
                </div>
                {mentions.map((m) => (
                  <MentionRow key={m.id} mention={m} />
                ))}
              </>
            )}
            {notifications.length > 0 && (
              <>
                {mentions.length > 0 && (
                  <div className="bg-muted/40 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Closed
                  </div>
                )}
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
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

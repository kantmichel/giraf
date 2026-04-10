"use client";

import { useState, useEffect } from "react";
import { Check, X, UserPlus, ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { SnoozePopover } from "./snooze-popover";
import { PRIORITY_LABELS } from "@/lib/constants";
import { useAssignees } from "@/hooks/use-assignees";
import { cn } from "@/lib/utils";

const priorityValues = PRIORITY_LABELS.map((l) => l.name.replace("priority: ", ""));

interface TriageActionsProps {
  repoOwner: string;
  repoName: string;
  onAccept: (priority: string, assignees: string[]) => void;
  onDecline: () => void;
  onSnooze: (until: string | null, wakeOnActivity: boolean) => void;
  disabled?: boolean;
}

export function TriageActions({
  repoOwner,
  repoName,
  onAccept,
  onDecline,
  onSnooze,
  disabled,
}: TriageActionsProps) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignToMe, setAssignToMe] = useState(false);
  const [otherAssignee, setOtherAssignee] = useState<string | null>(null);
  const { data: session } = useSession();
  const { data: availableAssignees } = useAssignees(repoOwner, repoName);

  const myUsername = session?.user?.githubUsername;

  // Favorite teammate persisted in localStorage
  const [favoriteTeammate, setFavoriteTeammate] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("gira-favorite-teammate");
    if (stored) setFavoriteTeammate(stored);
  }, []);

  function saveFavorite(login: string) {
    setFavoriteTeammate(login);
    localStorage.setItem("gira-favorite-teammate", login);
  }

  function getAssignees(): string[] {
    const assignees: string[] = [];
    if (assignToMe && myUsername) assignees.push(myUsername);
    if (otherAssignee) assignees.push(otherAssignee);
    return assignees;
  }

  function handleAccept(priority: string) {
    onAccept(priority, getAssignees());
    setPriorityOpen(false);
    setAssignToMe(false);
    setOtherAssignee(null);
  }

  const assignLabel = assignToMe && otherAssignee
    ? `${myUsername}, ${otherAssignee}`
    : assignToMe
      ? myUsername
      : otherAssignee
        ? otherAssignee
        : null;

  return (
    <div className="flex items-center gap-2">
      {/* Assign — standalone */}
      <Popover open={assignOpen} onOpenChange={setAssignOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
            {assignLabel ? (
              <>
                <UserPlus className="size-3.5" />
                <span className="max-w-24 truncate text-xs">{assignLabel}</span>
              </>
            ) : (
              <>
                <UserPlus className="size-3.5" />
                Assign
                <ChevronDown className="size-3 opacity-50" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={assignToMe}
                onCheckedChange={(checked) => setAssignToMe(checked === true)}
              />
              <Avatar className="size-4">
                <AvatarImage src={`https://github.com/${myUsername}.png?size=16`} />
                <AvatarFallback className="text-[8px]">{myUsername?.[0]}</AvatarFallback>
              </Avatar>
              Me ({myUsername})
            </label>

            {/* Favorite teammate — quick toggle */}
            {favoriteTeammate && favoriteTeammate !== myUsername && (
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={otherAssignee === favoriteTeammate}
                  onCheckedChange={(checked) =>
                    setOtherAssignee(checked ? favoriteTeammate : null)
                  }
                />
                <Avatar className="size-4">
                  <AvatarImage src={`https://github.com/${favoriteTeammate}.png?size=16`} />
                  <AvatarFallback className="text-[8px]">{favoriteTeammate[0]}</AvatarFallback>
                </Avatar>
                {favoriteTeammate}
              </label>
            )}

            {/* Other teammate or search */}
            {otherAssignee && otherAssignee !== favoriteTeammate ? (
              <div className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                <Avatar className="size-4">
                  <AvatarImage src={`https://github.com/${otherAssignee}.png?size=16`} />
                  <AvatarFallback className="text-[8px]">{otherAssignee[0]}</AvatarFallback>
                </Avatar>
                <span>{otherAssignee}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setOtherAssignee(null)}
                  onKeyDown={(e) => e.key === "Enter" && setOtherAssignee(null)}
                >
                  <X className="size-3" />
                </span>
              </div>
            ) : !otherAssignee ? (
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-accent"
                  >
                    <UserPlus className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Search teammate...</span>
                    <ChevronDown className="ml-auto size-3 text-muted-foreground" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-0" align="start" side="right">
                  <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                      <CommandEmpty>No teammates found.</CommandEmpty>
                      <CommandGroup>
                        {availableAssignees
                          ?.filter((a) => a.login !== myUsername && a.login !== favoriteTeammate)
                          .map((a) => (
                            <CommandItem
                              key={a.id}
                              onSelect={() => {
                                setOtherAssignee(a.login);
                                saveFavorite(a.login);
                              }}
                            >
                              <Avatar className="mr-2 size-5">
                                <AvatarImage src={a.avatarUrl} alt={a.login} />
                                <AvatarFallback className="text-[8px]">{a.login[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{a.login}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      {/* Accept — just priority */}
      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" disabled={disabled}>
            <Check className="mr-1.5 size-3.5" />
            Accept
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Set priority
          </p>
          {priorityValues.map((p) => (
            <button
              key={p}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => handleAccept(p)}
            >
              <IssuePriorityBadge priority={p} />
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="sm" onClick={onDecline} disabled={disabled}>
        <X className="mr-1.5 size-3.5" />
        Decline
      </Button>

      <SnoozePopover onSnooze={onSnooze} disabled={disabled} />
    </div>
  );
}

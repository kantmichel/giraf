"use client";

import { useState } from "react";
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
  const [assignToMe, setAssignToMe] = useState(true);
  const [otherAssignee, setOtherAssignee] = useState<string | null>(null);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const { data: session } = useSession();
  const { data: availableAssignees } = useAssignees(repoOwner, repoName);

  const myUsername = session?.user?.githubUsername;

  function handleAccept(priority: string) {
    const assignees: string[] = [];
    if (assignToMe && myUsername) assignees.push(myUsername);
    if (otherAssignee) assignees.push(otherAssignee);
    onAccept(priority, assignees);
    setPriorityOpen(false);
    setOtherAssignee(null);
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" disabled={disabled}>
            <Check className="mr-1.5 size-3.5" />
            Accept
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1" align="start">
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

          <div className="border-t mt-1 pt-2 px-3 pb-2 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Assign</p>

            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={assignToMe}
                onCheckedChange={(checked) => setAssignToMe(checked === true)}
              />
              <UserPlus className="size-3 text-muted-foreground" />
              Me ({myUsername})
            </label>

            <Popover open={assigneePickerOpen} onOpenChange={setAssigneePickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-accent">
                  {otherAssignee ? (
                    <>
                      <Avatar className="size-4">
                        <AvatarImage src={`https://github.com/${otherAssignee}.png?size=16`} />
                        <AvatarFallback className="text-[8px]">{otherAssignee[0]}</AvatarFallback>
                      </Avatar>
                      <span>{otherAssignee}</span>
                      <button
                        className="ml-auto text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOtherAssignee(null);
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Add teammate...</span>
                      <ChevronDown className="ml-auto size-3 text-muted-foreground" />
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-0" align="start" side="right">
                <Command>
                  <CommandInput placeholder="Search..." />
                  <CommandList>
                    <CommandEmpty>No teammates found.</CommandEmpty>
                    <CommandGroup>
                      {availableAssignees
                        ?.filter((a) => a.login !== myUsername)
                        .map((a) => (
                          <CommandItem
                            key={a.id}
                            onSelect={() => {
                              setOtherAssignee(a.login);
                              setAssigneePickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-3.5",
                                otherAssignee === a.login ? "opacity-100" : "opacity-0"
                              )}
                            />
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
          </div>
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

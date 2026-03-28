"use client";

import { useState } from "react";
import { Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAssignees } from "@/hooks/use-assignees";
import { cn } from "@/lib/utils";
import type { NormalizedUser } from "@/types/github";

interface IssueAssigneesEditorProps {
  owner: string;
  repo: string;
  currentAssignees: NormalizedUser[];
  onUpdate: (assignees: string[]) => void;
  disabled?: boolean;
}

export function IssueAssigneesEditor({
  owner,
  repo,
  currentAssignees,
  onUpdate,
  disabled,
}: IssueAssigneesEditorProps) {
  const [open, setOpen] = useState(false);
  const { data: availableAssignees } = useAssignees(owner, repo);
  const currentLogins = new Set(currentAssignees.map((a) => a.login));

  function handleToggle(login: string) {
    const next = new Set(currentLogins);
    if (next.has(login)) {
      next.delete(login);
    } else {
      next.add(login);
    }
    onUpdate([...next]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1.5 p-1" disabled={disabled}>
          {currentAssignees.length > 0 ? (
            <div className="flex -space-x-1">
              {currentAssignees.slice(0, 3).map((a) => (
                <Avatar key={a.id} className="size-5 border border-background">
                  <AvatarImage src={a.avatarUrl} alt={a.login} />
                  <AvatarFallback className="text-[8px]">{a.login[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" /> Assign
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search assignees..." />
          <CommandList>
            <CommandEmpty>No assignees found.</CommandEmpty>
            <CommandGroup>
              {availableAssignees?.map((a) => (
                <CommandItem
                  key={a.id}
                  onSelect={() => handleToggle(a.login)}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3.5",
                      currentLogins.has(a.login) ? "opacity-100" : "opacity-0"
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
  );
}

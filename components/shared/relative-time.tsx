import { formatDistanceToNow, format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RelativeTime({ date }: { date: string }) {
  const d = new Date(date);
  const relative = formatDistanceToNow(d, { addSuffix: true });
  const absolute = format(d, "MMM d, yyyy 'at' h:mm a");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="whitespace-nowrap text-xs text-muted-foreground" suppressHydrationWarning>
          {relative}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{absolute}</p>
      </TooltipContent>
    </Tooltip>
  );
}

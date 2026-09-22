import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeDueMultiplier, daysUntilDue } from "@/lib/wsjf";
import { cn } from "@/lib/utils";
import { formatDay, formatDayShort } from "@/lib/format-date";
import type { NormalizedIssue } from "@/types/github";

/**
 * Target date as a compact pill. The badge lights up exactly when the due date
 * starts lifting the WSJF score, so what you see matches why the card moved —
 * which means the threshold follows effort rather than a fixed number of days.
 */
export function IssueDueBadge({
  dueDate,
  effort,
  className,
}: {
  dueDate: string | null;
  effort: NormalizedIssue["effort"];
  className?: string;
}) {
  const days = daysUntilDue(dueDate);
  if (!dueDate || days === null) return null;

  const overdue = days < 0;
  const boosting = computeDueMultiplier(dueDate, effort) > 1;

  const tone = overdue
    ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
    : boosting
      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      : "bg-muted/50 text-muted-foreground";

  const short = formatDayShort(dueDate);

  const relative = overdue
    ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
    : days === 0
      ? "due today"
      : `in ${days} day${days === 1 ? "" : "s"}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "shrink-0 rounded px-1 text-[10px] font-medium tabular-nums",
            tone,
            className
          )}
          suppressHydrationWarning
        >
          {short}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span className="text-xs">
          Due {formatDay(dueDate)} · {relative}
          {boosting && !overdue ? " · boosting priority" : ""}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

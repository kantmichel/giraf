import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ageInDays, formatAge } from "@/lib/issue-age";
import { cn } from "@/lib/utils";

/**
 * How long an issue has been around, as a compact pill. Colour thresholds
 * line up with the age filter buckets: quiet under a week, plain under a
 * month, amber under three, red beyond that.
 */
export function IssueAgeBadge({
  createdAt,
  className,
}: {
  createdAt: string;
  className?: string;
}) {
  const days = ageInDays(createdAt);

  const tone =
    days < 7
      ? "bg-muted/50 text-muted-foreground"
      : days < 30
        ? "bg-muted/50 text-foreground"
        : days < 90
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300";

  const absolute = new Date(createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

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
          {formatAge(days)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <span className="text-xs">
          Created {absolute} · {days} day{days === 1 ? "" : "s"} old
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

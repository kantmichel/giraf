import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const effortStyles: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function IssueEffortBadge({ effort }: { effort: string | null }) {
  if (!effort) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Badge
      variant="secondary"
      className={cn("text-[11px] font-medium", effortStyles[effort])}
    >
      {effort}
    </Badge>
  );
}

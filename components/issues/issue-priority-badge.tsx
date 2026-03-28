import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const priorityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function IssuePriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Badge
      variant="secondary"
      className={cn("text-[11px] font-medium", priorityStyles[priority])}
    >
      {priority}
    </Badge>
  );
}

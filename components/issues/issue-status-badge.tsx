import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  "to do": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "doing": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "in review": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "done": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function IssueStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Badge
      variant="secondary"
      className={cn("text-[11px] font-medium", statusStyles[status])}
    >
      {status}
    </Badge>
  );
}

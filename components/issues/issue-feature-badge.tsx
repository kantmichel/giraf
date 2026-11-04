import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { workKind } from "@/lib/work-kind";
import { cn } from "@/lib/utils";
import type { NormalizedIssue } from "@/types/github";

/**
 * The feature (org Project) an issue belongs to, linking to the Project.
 * A Feature-typed issue in no Project says so, because it cannot be planned
 * into a month until it is in one. Maintenance with no Project shows nothing.
 */
export function IssueFeatureBadge({
  issue,
  className,
}: {
  issue: Pick<NormalizedIssue, "features" | "issueType">;
  className?: string;
}) {
  const [first, ...rest] = issue.features;

  if (!first) {
    if (workKind(issue) !== "feature") return null;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("text-xs text-muted-foreground", className)}>no Project</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Feature-typed, but in no Project yet, so it can&apos;t be planned</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={first.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn("inline-flex min-w-0 items-center gap-1", className)}
        >
          <Badge variant="secondary" className="min-w-0 text-[11px] font-normal">
            <span className="min-w-0 truncate">{first.title}</span>
          </Badge>
          {rest.length > 0 && (
            <span className="text-[11px] text-muted-foreground">+{rest.length}</span>
          )}
        </a>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">
          {issue.features.map((f) => `${f.title} (place ${f.position + 1})`).join(" · ")}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

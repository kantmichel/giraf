import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Pass `min-w-0 shrink` as className to let the name ellipsize in a tight row. */
export function IssueRepoBadge({ repo, className }: { repo: string; className?: string }) {
  const hue = hashToHue(repo);
  const shortName = repo.includes("/") ? repo.split("/")[1] : repo;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn("text-[11px] font-normal", className)}
          style={{
            borderColor: `hsl(${hue}, 50%, 50%)`,
            color: `hsl(${hue}, 50%, 40%)`,
          }}
        >
          <span className="min-w-0 truncate">{shortName}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{repo}</p>
      </TooltipContent>
    </Tooltip>
  );
}

import { Badge } from "@/components/ui/badge";

function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function IssueRepoBadge({ repo }: { repo: string }) {
  const hue = hashToHue(repo);

  return (
    <Badge
      variant="outline"
      className="text-[11px] font-normal"
      style={{
        borderColor: `hsl(${hue}, 50%, 50%)`,
        color: `hsl(${hue}, 50%, 40%)`,
      }}
    >
      {repo}
    </Badge>
  );
}

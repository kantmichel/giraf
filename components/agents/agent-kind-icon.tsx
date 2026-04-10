import { Eye, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentKind } from "@/types/agents";

interface AgentKindIconProps {
  kind: AgentKind;
  className?: string;
}

export function AgentKindIcon({ kind, className }: AgentKindIconProps) {
  if (kind === "claude-work") {
    return (
      <img
        src="/claudecode-color.svg"
        alt="Claude"
        className={cn("inline-block", className)}
      />
    );
  }
  if (kind === "claude-review") {
    return <Eye className={className} />;
  }
  return <Workflow className={className} />;
}

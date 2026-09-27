"use client";

import { useDraggable } from "@dnd-kit/core";
import { ChevronsUp, Zap } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { IssuePriorityBadge } from "@/components/issues/issue-priority-badge";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { IssueDueBadge } from "@/components/issues/issue-due-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatWsjf, shortKey } from "@/lib/wsjf";
import type { ScoredIssue } from "@/lib/wsjf";
import { cn } from "@/lib/utils";

/** How a card renders in its column. Carried in the drag data so the card
 *  following the pointer looks exactly like the one that was picked up. */
export interface KanbanCardDisplay {
  showTime?: boolean;
  timeField?: string;
  emphasizeWsjf?: boolean;
}

export interface KanbanDragData {
  issue: ScoredIssue;
  display: KanbanCardDisplay;
}

const PRIORITY_BORDER_COLORS: Record<string, string> = {
  critical: "#b6020540",
  high: "#d93f0b40",
  medium: "#fbca0450",
  low: "#0e8a1640",
};

// shrink-0: the column list is a scrolling flex column, and overflow-hidden
// would otherwise let it squash cards instead of scrolling them.
const CARD_CLASS = "shrink-0 overflow-hidden rounded-md border bg-card p-3 text-left shadow-sm";

function priorityBorder(issue: ScoredIssue) {
  return issue.priority ? { borderColor: PRIORITY_BORDER_COLORS[issue.priority] } : undefined;
}

interface KanbanCardProps extends KanbanCardDisplay {
  issue: ScoredIssue;
  onClick: () => void;
}

export function KanbanCard({ issue, onClick, ...display }: KanbanCardProps) {
  const data: KanbanDragData = { issue, display };
  // Draggable, not sortable. Order within a column comes from its sort, so
  // there is nothing to reorder — and a sortable card is also a drop target:
  // dropping onto one wrote its "owner/repo:number" id to GitHub as a status.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${issue.repo.fullName}:${issue.number}`,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={priorityBorder(issue)}
      className={cn(
        CARD_CLASS,
        "cursor-grab transition-shadow outline-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <KanbanCardBody issue={issue} {...display} />
    </div>
  );
}

/** The card as it follows the pointer during a drag: same body, no drag wiring. */
export function KanbanCardPreview({ issue, display }: KanbanDragData) {
  return (
    <div style={priorityBorder(issue)} className={cn(CARD_CLASS, "cursor-grabbing shadow-lg")}>
      <KanbanCardBody issue={issue} {...display} />
    </div>
  );
}

function KanbanCardBody({
  issue,
  showTime,
  timeField,
  emphasizeWsjf,
}: { issue: ScoredIssue } & KanbanCardDisplay) {
  const timeMap: Record<string, string | null> = {
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    closedAt: issue.closedAt,
  };
  const time = showTime && timeField ? timeMap[timeField] : null;

  return (
    <>
      {/* Where it lives and who has it. The repo name gives way first. */}
      <div className="flex min-w-0 items-center gap-1.5">
        <IssueRepoBadge repo={issue.repo.fullName} className="min-w-0 shrink" />
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          #{issue.number}
        </span>
        {issue.assignees.length > 0 && (
          <div className="ml-auto flex shrink-0 -space-x-1.5">
            {issue.assignees.slice(0, 2).map((a) => (
              <Avatar key={a.id} className="size-5 border border-background">
                <AvatarImage src={a.avatarUrl} alt={a.login} />
                <AvatarFallback className="text-[8px]">{a.login[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm leading-snug font-medium wrap-break-word">
        {issue.title}
      </p>
      {/* Wraps rather than overflowing — the card sets the width, not its chips. */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <IssuePriorityBadge priority={issue.priority} />
        <WsjfChip issue={issue} emphasize={emphasizeWsjf} />
        <IssueDueBadge dueDate={issue.dueDate} effort={issue.effort} />
        {time && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            <RelativeTime date={time} />
          </span>
        )}
      </div>
    </>
  );
}

function WsjfChip({ issue, emphasize }: { issue: ScoredIssue; emphasize?: boolean }) {
  const { score, ownScore, liftedBy } = issue.wsjf;
  if (score === null) return null;

  const lifted = liftedBy.length > 0;
  const boosted = !lifted && issue.impacts.length > 0;
  const tooltip = lifted
    ? `WSJF lifted to ${formatWsjf(score)} — blocks ${liftedBy.map(shortKey).join(", ")}${ownScore === null ? " (no priority or effort set)" : ` (own score ${formatWsjf(ownScore)})`}`
    : boosted
      ? `WSJF: priority(${issue.priority}) ÷ effort(${issue.effort}) × impact(${issue.impacts.join(", ")})`
      : `WSJF: priority(${issue.priority}) ÷ effort(${issue.effort})`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 text-[10px] tabular-nums",
        lifted
          ? "bg-[#d97706]/10 font-semibold text-[#d97706]"
          : boosted
            ? "bg-[#7057ff]/10 font-semibold text-[#7057ff]"
            : emphasize
              ? "bg-primary/10 font-semibold text-primary"
              : "text-muted-foreground"
      )}
      title={tooltip}
    >
      {lifted && <ChevronsUp className="size-2.5" />}
      {boosted && <Zap className="size-2.5" />}
      {formatWsjf(score)}
    </span>
  );
}

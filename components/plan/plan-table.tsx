import { Fragment } from "react";
import { Check, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { IssueStatusBadge } from "@/components/issues/issue-status-badge";
import { useOpenIssue } from "@/hooks/use-open-issue";
import { formatWsjf } from "@/lib/wsjf";
import { formatHours, type LaneForecast, type LaneKind, type PlanRow } from "@/lib/month-plan";
import { cn } from "@/lib/utils";

function Divider({ colSpan, children, tone }: { colSpan: number; children: React.ReactNode; tone: "line" | "warn" | "muted" }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn(
          "py-1.5 text-xs font-medium",
          tone === "line"
            ? "border-t-2 border-destructive/60 text-destructive"
            : tone === "muted"
              ? "border-t-2 text-muted-foreground"
              : "text-amber-600"
        )}
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

/**
 * The lane's tickets in the order they get worked, with the line where the
 * month's hours run out. Above the line is the month; below it waits for the
 * next one. A row opens the issue's drawer on the issues page.
 */
export function PlanTable({
  lane,
  laneId,
  monthLabel,
  person,
  earlier = 0,
}: {
  lane: LaneForecast;
  laneId: LaneKind;
  monthLabel: string;
  person: string;
  /** The person's tickets in the month's features that earlier months take. */
  earlier?: number;
}) {
  const openIssue = useOpenIssue();
  const colSpan = 7;
  // Done maintenance is one summary row, so the table starts with what is
  // next to pick up; it still counts in the bar and the running total.
  // Features keep their done rows, as progress through the feature.
  const collapseDone = laneId === "maintenance";
  const doneRows = collapseDone ? lane.rows.filter((r) => r.state === "done" && r.fits) : [];
  const rows = collapseDone ? lane.rows.filter((r) => !(r.state === "done" && r.fits)) : lane.rows;
  // Live: a line where the hours run out, then the unsized tickets. Agreed:
  // one divider between the agreed list and everything else waiting.
  const firstOut = lane.agreed
    ? rows.findIndex((r) => !r.fits)
    : rows.findIndex((r) => !r.fits && r.hours !== null);
  const firstUnsized = lane.agreed ? -1 : rows.findIndex((r) => r.hours === null && r.state !== "done");

  if (rows.length === 0 && doneRows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        {laneId === "feature"
          ? earlier > 0
            ? `Nothing of these features is left for ${person} in ${monthLabel}: earlier months take all ${earlier} of their tickets in them.`
            : "No tickets yet: add a feature above, or assign its tickets in GitHub."
          : laneId === "adhoc"
            ? `No ad hoc work in ${monthLabel}. A ticket of type Ad hoc assigned in GitHub lands here; the reserve also covers support without a ticket.`
            : "No maintenance tickets assigned."}
      </div>
    );
  }

  const renderRow = (row: PlanRow, index: number) => (
    <TableRow
      key={`${row.issue.repo.fullName}#${row.issue.number}`}
      className={cn("cursor-pointer", !row.fits && "text-muted-foreground", row.state === "done" && "opacity-70")}
      onClick={() => openIssue(row.issue)}
    >
      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-1.5">
          {row.state === "done" && <Check className="size-3.5 shrink-0 text-emerald-600" />}
          <span className="line-clamp-1 font-medium">{row.issue.title}</span>
          {row.afterAgreement && (
            <span className="shrink-0 rounded border border-amber-500/50 px-1 text-[10px] font-medium text-amber-600">
              after agreement
            </span>
          )}
          <a
            href={row.issue.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Open in GitHub"
          >
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IssueRepoBadge repo={row.issue.repo.fullName} />#{row.issue.number}
        </div>
      </TableCell>
      {/* Cells don't wrap, so a long feature name is cut at the column's
          edge instead of running into Effort; the full name is on hover. */}
      <TableCell className="truncate text-sm text-muted-foreground" title={laneId === "feature" ? row.feature?.title : undefined}>
        {laneId === "feature" ? (row.feature?.title ?? "") : formatWsjf(row.issue.wsjf.score)}
      </TableCell>
      <TableCell className="text-sm">{row.issue.effort ?? "not set"}</TableCell>
      <TableCell className="text-right text-sm tabular-nums">{row.hours === null ? "?" : formatHours(row.hours)}</TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {row.hours === null ? "" : formatHours(row.cumulative)}
      </TableCell>
      <TableCell>
        <IssueStatusBadge status={row.state === "done" ? "done" : row.issue.status} />
      </TableCell>
    </TableRow>
  );

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="min-w-[240px]">Ticket</TableHead>
            <TableHead className="w-44">{laneId === "feature" ? "Feature" : "WSJF"}</TableHead>
            <TableHead className="w-20">Effort</TableHead>
            <TableHead className="w-20 text-right">Hours</TableHead>
            <TableHead className="w-20 text-right">Total</TableHead>
            <TableHead className="w-28">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {doneRows.length > 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell />
              <TableCell colSpan={3} className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600" />
                  {doneRows.length} agreed ticket{doneRows.length === 1 ? "" : "s"} done, counted in the bar
                </span>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {formatHours(lane.doneHours)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {formatHours(lane.doneHours)}
              </TableCell>
              <TableCell />
            </TableRow>
          )}
          {rows.map((row, i) => (
            <Fragment key={`${row.issue.repo.fullName}#${row.issue.number}`}>
              {i === firstOut &&
                (lane.agreed ? (
                  <Divider colSpan={colSpan} tone="muted">
                    Not agreed for {monthLabel}: next up if there&apos;s time
                  </Divider>
                ) : (
                  <Divider colSpan={colSpan} tone="line">
                    {formatHours(lane.budget)} reached: below this line doesn&apos;t fit in {monthLabel}
                  </Divider>
                ))}
              {i === firstUnsized && (
                <Divider colSpan={colSpan} tone="warn">
                  No effort label, so no hours: give these an effort to place them
                </Divider>
              )}
              {renderRow(row, i)}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

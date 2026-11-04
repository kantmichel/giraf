import { cn } from "@/lib/utils";
import { formatHours, type LaneForecast, type MonthForecast } from "@/lib/month-plan";

export type LaneId = "feature" | "maintenance";

const SEGMENTS = [
  { key: "doneHours", label: "done", className: "bg-emerald-500" },
  { key: "inProgressHours", label: "in progress", className: "bg-amber-500" },
  { key: "toDoHours", label: "to do", className: "bg-[#7057ff]/60" },
] as const;

/** One lane's hours as a bar: done, in progress and planned against the lane's budget. */
function LaneBar({ lane }: { lane: LaneForecast }) {
  const used = lane.doneHours + lane.inProgressHours + lane.toDoHours;
  // Scaled to the budget, or to the work when done work already ran past it.
  const scale = Math.max(lane.budget, used) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
      {SEGMENTS.map((s) => {
        const hours = lane[s.key];
        if (hours <= 0) return null;
        return <div key={s.key} className={s.className} style={{ width: `${(hours / scale) * 100}%` }} />;
      })}
    </div>
  );
}

function LaneCard({
  title,
  lane,
  selected,
  onSelect,
  detail,
}: {
  title: string;
  lane: LaneForecast;
  selected: boolean;
  onSelect: () => void;
  detail?: string;
}) {
  const used = lane.doneHours + lane.inProgressHours + lane.toDoHours;
  const free = Math.max(0, lane.budget - used);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent/40",
        selected && "border-[#7057ff] ring-1 ring-[#7057ff]"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {lane.agreed ? "agreed" : "forecast"}
          </span>
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">{formatHours(lane.budget)}</span>
      </div>
      <LaneBar lane={lane} />
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", s.className)} />
            {formatHours(lane[s.key])} {s.label}
          </span>
        ))}
        <span>{formatHours(free)} free</span>
      </div>
      {lane.overflowHours > 0 && (
        <span className="text-xs font-medium text-destructive">
          {lane.agreed
            ? `The agreed work is ${formatHours(lane.overflowHours)} over these hours`
            : `${formatHours(lane.overflowHours)} doesn't fit this month`}
        </span>
      )}
      {lane.unsized > 0 && (
        <span className="text-xs text-amber-600">
          {lane.unsized} ticket{lane.unsized === 1 ? "" : "s"} without an effort label, not counted
        </span>
      )}
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </button>
  );
}

/** Hours that fit per planned feature, in plan order: "Sign in 29 h · Inference 8 h". */
function featureBreakdown(lane: LaneForecast): string {
  const byTitle = new Map<string, number>();
  for (const row of lane.rows) {
    if (!row.fits || !row.feature || row.hours === null) continue;
    byTitle.set(row.feature.title, (byTitle.get(row.feature.title) ?? 0) + row.hours);
  }
  return Array.from(byTitle, ([title, hours]) => `${title} ${formatHours(hours)}`).join(" · ");
}

export function PlanLanes({
  forecast,
  selected,
  onSelect,
}: {
  forecast: MonthForecast;
  selected: LaneId;
  onSelect: (lane: LaneId) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr]">
      <LaneCard
        title="Feature"
        lane={forecast.feature}
        selected={selected === "feature"}
        onSelect={() => onSelect("feature")}
        detail={featureBreakdown(forecast.feature) || undefined}
      />
      <LaneCard
        title="Maintenance"
        lane={forecast.maintenance}
        selected={selected === "maintenance"}
        onSelect={() => onSelect("maintenance")}
        detail="Top down by WSJF"
      />
      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">Ad hoc</span>
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatHours(forecast.budget.adhoc)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Kept free for support and questions. Not tracked, so no tickets needed.
        </span>
      </div>
    </div>
  );
}

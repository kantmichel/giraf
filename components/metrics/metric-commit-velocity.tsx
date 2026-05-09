"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangeSelector } from "@/components/agents/date-range-selector";
import {
  computeDateRangeForRepo,
  type DateRangePreset,
} from "@/lib/agents/date-range";
import { useTrackedRepos } from "@/hooks/use-tracked-repos";
import { useCommitVelocity } from "@/hooks/use-commit-velocity";

const PRESETS: DateRangePreset[] = [
  "last-30-days",
  "last-90-days",
  "last-365-days",
  "this-year",
  "since-repo-creation",
];

const chartConfig: ChartConfig = {
  seriesA: { label: "Merges to default branch", color: "var(--chart-1)" },
  seriesB: { label: "Original commits in PRs", color: "var(--chart-2)" },
};

const TOOLTIP_HINT =
  "Series A counts commits on the default branch (squash merges = 1 commit). " +
  "Series B counts the original commits inside merged PRs, recovering per-author cadence. " +
  "Buckets are UTC.";

function formatBucketTick(date: string, bucket: "day" | "week" | "month") {
  const d = new Date(date);
  if (bucket === "month") {
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function MetricCommitVelocity() {
  const { data: trackedRepos, isLoading: reposLoading } = useTrackedRepos();
  const [repoOverride, setRepoOverride] = useState<string | null>(null);
  const [preset, setPreset] = useState<DateRangePreset>("last-90-days");
  const [excludeMerges, setExcludeMerges] = useState(true);

  const defaultRepo = useMemo(() => {
    if (!trackedRepos || trackedRepos.length === 0) return null;
    const pulseFe = trackedRepos.find((r) => r.repo === "pulse-fe");
    const next = pulseFe ?? trackedRepos[0];
    return `${next.owner}/${next.repo}`;
  }, [trackedRepos]);

  const selectedRepo = repoOverride ?? defaultRepo;

  const [owner, name] = useMemo(() => {
    if (!selectedRepo) return [null, null] as const;
    const [o, n] = selectedRepo.split("/");
    return [o, n] as const;
  }, [selectedRepo]);

  // For "since-repo-creation" we omit from/to and let the server resolve
  // it from the cached repo_created_at. Other presets are computed locally.
  const range = useMemo(() => computeDateRangeForRepo(preset, null), [preset]);
  const fromIso =
    preset === "since-repo-creation" ? undefined : range.from?.toISOString();
  const toIso =
    preset === "since-repo-creation" ? undefined : range.to?.toISOString();

  const query = useCommitVelocity({
    owner: owner ?? "",
    repo: name ?? "",
    fromIso,
    toIso,
    excludeMerges,
    enabled: !!owner && !!name,
  });

  const bucket = query.data?.range.bucket ?? "day";
  const buckets = useMemo(() => query.data?.buckets ?? [], [query.data]);
  const total = useMemo(
    () =>
      buckets.reduce(
        (acc, b) => ({ a: acc.a + b.seriesA, b: acc.b + b.seriesB }),
        { a: 0, b: 0 }
      ),
    [buckets]
  );

  const seriesA = query.data?.syncStatus.seriesA;
  const seriesB = query.data?.syncStatus.seriesB;
  const syncing = (seriesA?.inProgress || seriesB?.inProgress) ?? false;
  const lastError = seriesA?.lastError || seriesB?.lastError || null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Commit Velocity</CardTitle>
          <p className="text-xs text-muted-foreground">{TOOLTIP_HINT}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedRepo ?? ""}
            onValueChange={(v) => setRepoOverride(v)}
            disabled={reposLoading || !trackedRepos?.length}
          >
            <SelectTrigger className="h-8 min-w-[180px] gap-1.5 px-2.5 text-xs">
              <SelectValue placeholder="Select repo" />
            </SelectTrigger>
            <SelectContent align="end">
              {trackedRepos?.map((r) => (
                <SelectItem
                  key={`${r.owner}/${r.repo}`}
                  value={`${r.owner}/${r.repo}`}
                  className="text-xs"
                >
                  {r.owner}/{r.repo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangeSelector
            value={preset}
            onChange={setPreset}
            presets={PRESETS}
          />
          <div className="flex items-center gap-1.5">
            <Switch
              id="exclude-merges"
              checked={excludeMerges}
              onCheckedChange={setExcludeMerges}
            />
            <Label htmlFor="exclude-merges" className="text-xs font-normal">
              Exclude merge commits
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {syncing && (
          <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Syncing commit history…{" "}
            {seriesA?.inProgress && (
              <span>main: {seriesA.progressSeen.toLocaleString()} commits</span>
            )}
            {seriesA?.inProgress && seriesB?.inProgress && " · "}
            {seriesB?.inProgress && (
              <span>PRs: {seriesB.progressSeen.toLocaleString()}</span>
            )}
          </div>
        )}
        {lastError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {lastError}
          </div>
        )}

        {query.isLoading && !query.data ? (
          <Skeleton className="h-[260px] w-full" />
        ) : buckets.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            {syncing
              ? "Building cache… commits will appear shortly."
              : "No commits in this range."}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <div>
                <span className="font-mono text-foreground tabular-nums">
                  {total.a.toLocaleString()}
                </span>{" "}
                merges to default branch
              </div>
              <div>
                <span className="font-mono text-foreground tabular-nums">
                  {total.b.toLocaleString()}
                </span>{" "}
                original commits in PRs
              </div>
              <div className="ml-auto">
                Bucket: <span className="font-mono">{bucket}</span>
              </div>
            </div>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[260px] w-full"
            >
              <LineChart accessibilityLayer data={buckets} margin={{ left: 8, right: 8 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatBucketTick(v, bucket)}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="seriesA"
                  stroke="var(--color-seriesA)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="seriesB"
                  stroke="var(--color-seriesB)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

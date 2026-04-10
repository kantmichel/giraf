"use client";

import {
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  GitPullRequest,
  Info,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { IssueRepoBadge } from "@/components/issues/issue-repo-badge";
import { RelativeTime } from "@/components/shared/relative-time";
import { useIssueComments } from "@/hooks/use-issue-comments";
import { useRunAnnotations } from "@/hooks/use-run-annotations";
import { cn } from "@/lib/utils";
import { AgentKindIcon } from "./agent-kind-icon";
import type { AgentRun, WorkflowJobSummary } from "@/types/agents";
import type { WorkflowRunAnnotation } from "@/lib/github/workflow-runs";

interface AgentRunDrawerProps {
  run: AgentRun | null;
  onClose: () => void;
}

export function AgentRunDrawer({ run, onClose }: AgentRunDrawerProps) {
  return (
    <Sheet open={run !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[520px] gap-0 p-0 sm:max-w-[520px]"
      >
        {run && <DrawerBody run={run} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ run }: { run: AgentRun }) {
  const currentStage = run.stages[run.currentStageIndex];
  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <div className="flex items-start gap-3">
          <AgentKindIcon kind={run.kind} className="mt-0.5 size-5 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <SheetTitle className="truncate text-base">{run.title}</SheetTitle>
            <SheetDescription asChild>
              <div className="mt-1 flex items-center gap-2">
                {run.subtitle && <IssueRepoBadge repo={run.subtitle} />}
                {run.issue && (
                  <span className="text-xs text-muted-foreground">
                    #{run.issue.number}
                  </span>
                )}
                {run.runNumber && !run.issue && (
                  <span className="text-xs text-muted-foreground">
                    run #{run.runNumber}
                  </span>
                )}
              </div>
            </SheetDescription>
          </div>
          <OpenInGithubButton run={run} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary" className="h-5 text-[11px]">
            {currentStage?.def.label ?? "Unknown"}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            started <RelativeTime date={run.startedAt} /> · last update{" "}
            <RelativeTime date={run.updatedAt} />
          </span>
        </div>
      </SheetHeader>
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="flex flex-col gap-5 px-5 py-4">
          {run.kind === "gh-action" ? (
            <GhActionDetail run={run} />
          ) : (
            <ClaudeRunDetail run={run} />
          )}
        </div>
      </ScrollArea>
    </>
  );
}

function OpenInGithubButton({ run }: { run: AgentRun }) {
  const href = run.issue?.htmlUrl ?? run.workflow?.htmlUrl;
  if (!href) return null;
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8 shrink-0"
      asChild
      title="Open on GitHub"
    >
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLink className="size-4" />
      </a>
    </Button>
  );
}

function ClaudeRunDetail({ run }: { run: AgentRun }) {
  return (
    <>
      {run.linkedPrs && run.linkedPrs.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <GitPullRequest className="size-3.5" />
            Pull requests
          </h3>
          <div className="flex flex-col gap-2">
            {run.linkedPrs.map((pr) => (
              <a
                key={pr.number}
                href={pr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-md border p-2.5 transition-colors hover:bg-accent/40"
              >
                <PrStateBadge state={pr.state} />
                <span className="shrink-0 text-xs text-muted-foreground">
                  #{pr.number}
                </span>
                <span className="flex-1 truncate text-sm">{pr.title}</span>
                <ExternalLink className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </section>
      )}

      {run.issue && (
        <>
          {run.linkedPrs && run.linkedPrs.length > 0 && <Separator />}
          <ActivitySection
            owner={run.issue.owner}
            repo={run.issue.repo}
            number={run.issue.number}
          />
        </>
      )}
    </>
  );
}

function PrStateBadge({
  state,
}: {
  state: "open" | "closed" | "merged" | "draft";
}) {
  const classes: Record<typeof state, string> = {
    open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    merged:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return (
    <Badge
      variant="secondary"
      className={cn("h-4 shrink-0 px-1.5 text-[10px] capitalize", classes[state])}
    >
      {state}
    </Badge>
  );
}

function ActivitySection({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
}) {
  const { data: comments, isLoading } = useIssueComments(owner, repo, number);

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Activity
      </h3>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !comments || comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => {
            const isBot = c.user.login.endsWith("[bot]");
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-md border p-3",
                  isBot && "border-amber-400/30 bg-amber-50/50 dark:bg-amber-900/10"
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarImage src={c.user.avatarUrl} alt={c.user.login} />
                    <AvatarFallback className="text-[10px]">
                      {c.user.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{c.user.login}</span>
                  <span className="text-[11px] text-muted-foreground">
                    <RelativeTime date={c.createdAt} />
                  </span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs prose-p:my-1 prose-pre:my-2 prose-pre:text-[11px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {c.body}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function GhActionDetail({ run }: { run: AgentRun }) {
  const jobs = run.jobs ?? [];
  // Extract the GitHub run id from "gh-action:12345"
  const runIdStr = run.id.startsWith("gh-action:") ? run.id.slice(10) : null;
  const runId = runIdStr ? parseInt(runIdStr, 10) : null;
  const isTerminal =
    run.status === "completed" || run.status === "failed";

  const {
    data: annotationsData,
    isLoading: annotationsLoading,
    isError: annotationsError,
  } = useRunAnnotations(runId, true);
  const annotations = annotationsData?.annotations ?? [];

  return (
    <>
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Jobs
        </h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isTerminal
              ? "No jobs executed in this run."
              : "Jobs will appear here once the run starts."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <Separator />
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Annotations
          {annotations.length > 0 && (
            <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">
              ({annotations.length})
            </span>
          )}
        </h3>
        {annotationsLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : annotationsError ? (
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load annotations from GitHub.
          </p>
        ) : annotations.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No annotations for this run.
            {run.workflow?.htmlUrl && (
              <>
                {" "}
                <a
                  href={run.workflow.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  View on GitHub →
                </a>
              </>
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {annotations.map((a, idx) => (
              <AnnotationCard key={idx} annotation={a} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function AnnotationCard({ annotation }: { annotation: WorkflowRunAnnotation }) {
  const toneClasses =
    annotation.level === "failure"
      ? "border-red-200/70 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/5"
      : annotation.level === "warning"
        ? "border-amber-200/70 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5"
        : "border-blue-200/70 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/5";

  const Icon =
    annotation.level === "failure"
      ? AlertCircle
      : annotation.level === "warning"
        ? AlertTriangle
        : Info;
  const iconColor =
    annotation.level === "failure"
      ? "text-red-600 dark:text-red-400"
      : annotation.level === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-blue-600 dark:text-blue-400";

  const CardContent = (
    <div className={cn("flex gap-2.5 rounded-lg border p-3", toneClasses)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconColor)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {annotation.title && (
          <div className="text-xs font-semibold">{annotation.title}</div>
        )}
        <div className="break-words font-mono text-[11px] leading-snug text-foreground/90">
          {annotation.message}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="font-medium">{annotation.checkRunName}</span>
          {annotation.path && (
            <>
              <span>·</span>
              <span className="font-mono">
                {annotation.path}
                {annotation.startLine ? `:${annotation.startLine}` : ""}
              </span>
            </>
          )}
        </div>
      </div>
      {annotation.checkRunUrl && (
        <ExternalLink className="size-3 shrink-0 text-muted-foreground opacity-60" />
      )}
    </div>
  );

  if (annotation.checkRunUrl) {
    return (
      <a
        href={annotation.checkRunUrl}
        target="_blank"
        rel="noreferrer"
        className="block transition-opacity hover:opacity-90"
      >
        {CardContent}
      </a>
    );
  }
  return CardContent;
}

function JobRow({ job }: { job: WorkflowJobSummary }) {
  const conclusionColor: Record<string, string> = {
    success:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    failure: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    skipped:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const label = job.conclusion ?? job.status;
  const badgeClass = job.conclusion
    ? conclusionColor[job.conclusion] ?? ""
    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";

  return (
    <a
      href={job.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border p-2.5 transition-colors hover:bg-accent/40"
    >
      <Badge
        variant="secondary"
        className={cn("h-4 px-1.5 text-[10px] capitalize", badgeClass)}
      >
        {label}
      </Badge>
      <span className="flex-1 truncate text-sm">{job.name}</span>
      {job.startedAt && (
        <span className="text-[11px] text-muted-foreground">
          <RelativeTime date={job.startedAt} />
        </span>
      )}
      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

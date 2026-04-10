import type { Octokit } from "@octokit/rest";
import { handleGitHubError } from "./errors";

export interface GHWorkflowRun {
  id: number;
  name: string | null;
  head_branch: string | null;
  head_sha: string;
  path: string;
  event: string;
  status: "queued" | "in_progress" | "completed" | null;
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null | string;
  workflow_id: number;
  url: string;
  html_url: string;
  run_number: number;
  run_started_at?: string;
  created_at: string;
  updated_at: string;
  actor?: { login: string; avatar_url: string } | null;
}

export interface GHWorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null | string;
  started_at: string | null;
  completed_at: string | null;
  html_url: string | null;
}

export async function listWorkflowRuns(
  octokit: Octokit,
  owner: string,
  repo: string,
  workflowId: number,
  options?: { perPage?: number; since?: string }
): Promise<GHWorkflowRun[]> {
  try {
    const params: {
      owner: string;
      repo: string;
      workflow_id: number;
      per_page: number;
      created?: string;
    } = {
      owner,
      repo,
      workflow_id: workflowId,
      per_page: options?.perPage ?? 30,
    };
    if (options?.since) {
      params.created = `>=${options.since}`;
    }
    const { data } = await octokit.rest.actions.listWorkflowRuns(params);
    return (data.workflow_runs ?? []) as unknown as GHWorkflowRun[];
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function listWorkflowRunJobs(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<GHWorkflowJob[]> {
  try {
    const { data } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    });
    return (data.jobs ?? []) as unknown as GHWorkflowJob[];
  } catch (error) {
    handleGitHubError(error);
  }
}

export interface WorkflowRunAnnotation {
  level: "notice" | "warning" | "failure";
  title: string | null;
  message: string;
  path: string | null;
  startLine: number | null;
  checkRunName: string;
  checkRunUrl: string | null;
}

/**
 * Fetch all annotations attached to a workflow run. We look in two places
 * because GitHub's data model isn't always consistent:
 *
 *   A) Each job in listJobsForWorkflowRun has a `check_run_url` we can
 *      parse for a check_run_id. This works when jobs exist, even if they
 *      were cancelled.
 *   B) The workflow run's check_suite — listForSuite returns every check_run
 *      in the suite. This catches runs that were cancelled before any jobs
 *      were created (e.g. concurrency cancellation).
 *
 * We take the union, list annotations per check_run, and return everything.
 * Errors on individual check runs are swallowed so one bad ID doesn't break
 * the whole response.
 */
/**
 * Fetch annotations attached to a workflow run.
 *
 * Budget-conscious: this used to also call `checks.listForRef` (which
 * returns every check_run on the commit across all workflows — expensive
 * and noisy), but we removed that path because it triggered rate-limit
 * exhaustion during background sync cleanup. Two remaining paths:
 *
 *   A) Each job in listJobsForWorkflowRun has a `check_run_url` we can
 *      parse for a check_run_id. Works when jobs exist.
 *   B) listForSuite with filter: "all" returns every check_run in the
 *      check_suite including older attempts that "latest" would hide.
 *      Catches concurrency-cancelled runs whose suite the user has not
 *      re-attempted yet.
 *
 * Per-check-run failures are swallowed.
 */
export async function listWorkflowRunAnnotations(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<WorkflowRunAnnotation[]> {
  const checkRunInfo = new Map<
    number,
    { name: string; url: string | null }
  >();

  let checkSuiteId: number | null = null;
  try {
    const { data: run } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    checkSuiteId = run.check_suite_id ?? null;
  } catch {
    // Non-fatal — fall through to path A
  }

  // Path A: check_run_ids from jobs
  try {
    const { data } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    });
    for (const job of data.jobs ?? []) {
      const jobAny = job as unknown as {
        check_run_url?: string;
        name: string;
        html_url: string | null;
      };
      if (!jobAny.check_run_url) continue;
      const match = jobAny.check_run_url.match(/check-runs\/(\d+)/);
      if (!match) continue;
      const id = parseInt(match[1], 10);
      if (!checkRunInfo.has(id)) {
        checkRunInfo.set(id, { name: jobAny.name, url: jobAny.html_url });
      }
    }
  } catch {
    // Non-fatal
  }

  // Path B: check_run_ids from the workflow run's check suite (filter=all)
  if (checkSuiteId) {
    try {
      const { data: suite } = await octokit.rest.checks.listForSuite({
        owner,
        repo,
        check_suite_id: checkSuiteId,
        per_page: 100,
        filter: "all",
      });
      for (const cr of suite.check_runs ?? []) {
        if (!checkRunInfo.has(cr.id)) {
          checkRunInfo.set(cr.id, {
            name: cr.name,
            url: cr.html_url ?? null,
          });
        }
      }
    } catch {
      // Non-fatal
    }
  }

  if (checkRunInfo.size === 0) return [];

  const annotations: WorkflowRunAnnotation[] = [];
  await Promise.all(
    [...checkRunInfo.entries()].map(async ([checkRunId, info]) => {
      try {
        const { data } = await octokit.rest.checks.listAnnotations({
          owner,
          repo,
          check_run_id: checkRunId,
          per_page: 50,
        });
        for (const a of data) {
          annotations.push({
            level: (a.annotation_level ?? "failure") as
              | "notice"
              | "warning"
              | "failure",
            title: a.title,
            message: a.message ?? "",
            path: a.path || null,
            startLine: a.start_line ?? null,
            checkRunName: info.name,
            checkRunUrl: info.url,
          });
        }
      } catch {
        // swallow per-check-run errors
      }
    })
  );
  return annotations;
}

import YAML from "yaml";
import type { AgentStageDef } from "@/types/agents";

export interface ParsedWorkflow {
  name: string;
  scheduleCrons: string[];
  stages: AgentStageDef[];
}

interface RawJob {
  needs?: string | string[];
  name?: string;
}

/**
 * Parse a GitHub Actions workflow YAML string and extract:
 *  - the top-level `name`
 *  - any `on.schedule[*].cron` entries
 *  - an ordered list of stages derived by topologically sorting `jobs` by `needs`
 */
export function parseWorkflowYaml(yamlContent: string): ParsedWorkflow {
  const doc = YAML.parse(yamlContent) as Record<string, unknown>;
  const name = typeof doc?.name === "string" ? doc.name : "Unnamed workflow";

  const scheduleCrons = extractScheduleCrons(doc);
  const jobs = (doc?.jobs ?? {}) as Record<string, RawJob>;
  const sortedJobNames = topologicalSortJobs(jobs);

  const codeCollisions = new Map<string, number>();
  const stages: AgentStageDef[] = sortedJobNames.map((jobName) => {
    const baseCode = deriveStageCode(jobName);
    const count = codeCollisions.get(baseCode) ?? 0;
    codeCollisions.set(baseCode, count + 1);
    const code = count === 0 ? baseCode : `${baseCode}${count + 1}`;
    const label = jobs[jobName]?.name ?? jobName;
    return { code, label, jobNames: [jobName] };
  });

  return { name, scheduleCrons, stages };
}

function extractScheduleCrons(doc: Record<string, unknown>): string[] {
  const on = doc?.on;
  if (!on) return [];
  if (typeof on === "string") return [];
  if (typeof on !== "object") return [];
  const schedule = (on as Record<string, unknown>).schedule;
  if (!Array.isArray(schedule)) return [];
  return schedule
    .map((entry) =>
      typeof entry === "object" && entry !== null && "cron" in entry
        ? String((entry as { cron?: unknown }).cron ?? "")
        : ""
    )
    .filter(Boolean);
}

/**
 * Kahn's algorithm with alphabetic tie-breaking for stable, deterministic output.
 * Throws if the graph has a cycle (which is not valid in GitHub Actions anyway).
 */
export function topologicalSortJobs(
  jobs: Record<string, RawJob>
): string[] {
  const nodes = Object.keys(jobs).sort();
  if (nodes.length === 0) return [];

  const inDegree = new Map<string, number>(nodes.map((n) => [n, 0]));
  const edges = new Map<string, string[]>(nodes.map((n) => [n, []]));

  for (const node of nodes) {
    const needs = jobs[node]?.needs;
    const deps = !needs ? [] : Array.isArray(needs) ? needs : [needs];
    for (const dep of deps) {
      if (!edges.has(dep)) continue;
      edges.get(dep)!.push(node);
      inDegree.set(node, (inDegree.get(node) ?? 0) + 1);
    }
  }

  const queue: string[] = nodes.filter((n) => (inDegree.get(n) ?? 0) === 0);
  const result: string[] = [];

  while (queue.length) {
    queue.sort();
    const next = queue.shift()!;
    result.push(next);
    for (const neighbor of edges.get(next) ?? []) {
      const d = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, d);
      if (d === 0) queue.push(neighbor);
    }
  }

  if (result.length !== nodes.length) {
    throw new Error("Workflow YAML contains a dependency cycle in `needs`");
  }
  return result;
}

function deriveStageCode(jobName: string): string {
  const stripped = jobName.replace(/[^a-zA-Z0-9]/g, "");
  if (stripped.length === 0) return "Jo";
  if (stripped.length === 1) return stripped.toUpperCase();
  return stripped.slice(0, 1).toUpperCase() + stripped.slice(1, 2).toLowerCase();
}

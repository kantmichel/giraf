import type { Octokit } from "@octokit/rest";
import { listLabels, createLabel } from "./labels";

export const IMPACT_PREFIX = "impact: ";

export interface ImpactLabelDiscovery {
  /** Full label name including prefix, e.g. "impact: customer". */
  name: string;
  /** Type portion only, e.g. "customer". */
  type: string;
  /** Hex color of the label as it appears in the first repo that has it. */
  color: string;
  description: string | null;
  /** Repos (in `owner/repo` form) that currently have this label. */
  presentIn: string[];
  /** Repos that don't have this label and would receive it on sync. */
  missingIn: string[];
}

/**
 * Walk all tracked repos and aggregate every `impact: <type>` label found.
 * Labels are deduped case-insensitively by full name. Color/description are
 * taken from the first repo where the label is found.
 */
export async function discoverImpactLabels(
  octokit: Octokit,
  repos: { owner: string; repo: string }[],
): Promise<ImpactLabelDiscovery[]> {
  const byName = new Map<string, ImpactLabelDiscovery>();
  const allRepoSlugs = repos.map((r) => `${r.owner}/${r.repo}`);

  for (const r of repos) {
    const slug = `${r.owner}/${r.repo}`;
    let labels;
    try {
      labels = await listLabels(octokit, r.owner, r.repo);
    } catch {
      // Skip repos we can't read; they'll show as "missing" for any discovered label.
      continue;
    }
    for (const l of labels) {
      if (!l.name.toLowerCase().startsWith(IMPACT_PREFIX)) continue;
      const key = l.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.presentIn.push(slug);
      } else {
        byName.set(key, {
          name: l.name,
          type: l.name.toLowerCase().replace(IMPACT_PREFIX, ""),
          color: l.color,
          description: l.description,
          presentIn: [slug],
          missingIn: [],
        });
      }
    }
  }

  // Backfill missingIn for each discovered label.
  for (const entry of byName.values()) {
    const present = new Set(entry.presentIn);
    entry.missingIn = allRepoSlugs.filter((s) => !present.has(s));
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Ensure an impact label exists in every given repo. Idempotent: repos that
 * already have a label with the same name (case-insensitive) are skipped.
 */
export async function syncImpactLabel(
  octokit: Octokit,
  repos: { owner: string; repo: string }[],
  label: { name: string; color: string; description?: string },
): Promise<{ created: string[]; existing: string[]; failed: { repo: string; error: string }[] }> {
  const created: string[] = [];
  const existing: string[] = [];
  const failed: { repo: string; error: string }[] = [];
  const targetName = label.name.toLowerCase();

  for (const r of repos) {
    const slug = `${r.owner}/${r.repo}`;
    try {
      const labels = await listLabels(octokit, r.owner, r.repo);
      const has = labels.some((l) => l.name.toLowerCase() === targetName);
      if (has) {
        existing.push(slug);
        continue;
      }
      await createLabel(octokit, r.owner, r.repo, label);
      created.push(slug);
    } catch (err) {
      failed.push({ repo: slug, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { created, existing, failed };
}

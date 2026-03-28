import type { Octokit } from "@octokit/rest";
import type { NormalizedLabel } from "@/types/github";
import { GIRA_LABELS } from "@/lib/constants";
import { handleGitHubError } from "./errors";

export async function listLabels(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<NormalizedLabel[]> {
  try {
    const labels = await octokit.paginate(
      octokit.rest.issues.listLabelsForRepo,
      { owner, repo, per_page: 100 }
    );

    return labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      description: l.description ?? null,
    }));
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function createLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  label: { name: string; color: string; description?: string }
): Promise<NormalizedLabel> {
  try {
    const { data } = await octokit.rest.issues.createLabel({
      owner,
      repo,
      name: label.name,
      color: label.color,
      description: label.description,
    });

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      description: data.description ?? null,
    };
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function ensureGirafLabels(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ created: string[]; existing: string[] }> {
  const existingLabels = await listLabels(octokit, owner, repo);
  const existingNames = new Set(
    existingLabels.map((l) => l.name.toLowerCase())
  );

  const created: string[] = [];
  const existing: string[] = [];

  for (const label of GIRA_LABELS) {
    if (existingNames.has(label.name.toLowerCase())) {
      existing.push(label.name);
    } else {
      await createLabel(octokit, owner, repo, label);
      created.push(label.name);
    }
  }

  return { created, existing };
}

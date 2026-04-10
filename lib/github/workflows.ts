import type { Octokit } from "@octokit/rest";
import { handleGitHubError } from "./errors";

export interface GHWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export async function listRepoWorkflows(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<GHWorkflow[]> {
  try {
    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
      per_page: 100,
    });
    return data.workflows.map((w) => ({
      id: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      html_url: w.html_url,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));
  } catch (error) {
    handleGitHubError(error);
  }
}

export async function getWorkflowFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      throw new Error(`Expected file at ${path}, got ${Array.isArray(data) ? "directory" : data.type}`);
    }
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch (error) {
    handleGitHubError(error);
  }
}

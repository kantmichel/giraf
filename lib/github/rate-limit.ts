import type { Octokit } from "@octokit/rest";
import type { RateLimitInfo } from "@/types/github";
import { handleGitHubError } from "./errors";

export async function getRateLimit(
  octokit: Octokit
): Promise<RateLimitInfo> {
  try {
    const { data } = await octokit.rest.rateLimit.get();
    const core = data.resources.core;

    return {
      limit: core.limit,
      remaining: core.remaining,
      reset: core.reset,
      used: core.used,
    };
  } catch (error) {
    handleGitHubError(error);
  }
}

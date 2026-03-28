import { RequestError } from "@octokit/request-error";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public rateLimitRemaining?: number
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export function handleGitHubError(error: unknown): never {
  if (error instanceof RequestError) {
    const remaining = error.response?.headers["x-ratelimit-remaining"]
      ? Number(error.response.headers["x-ratelimit-remaining"])
      : undefined;

    if (error.status === 401) {
      throw new GitHubApiError("GitHub token expired or invalid", 401, remaining);
    }
    if (error.status === 403) {
      throw new GitHubApiError(
        "Rate limit exceeded or insufficient permissions",
        403,
        remaining
      );
    }
    if (error.status === 404) {
      throw new GitHubApiError("Repository or resource not found", 404, remaining);
    }
    if (error.status === 422) {
      throw new GitHubApiError("Validation failed", 422, remaining);
    }
    throw new GitHubApiError(error.message, error.status, remaining);
  }
  throw error;
}

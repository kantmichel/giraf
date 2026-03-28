import { Octokit } from "@octokit/rest";

declare global {
  // eslint-disable-next-line no-var
  var __octokitCache: Map<string, Octokit> | undefined;
}

const cache =
  globalThis.__octokitCache ?? (globalThis.__octokitCache = new Map());

if (process.env.NODE_ENV === "development") {
  globalThis.__octokitCache = cache;
}

export function getOctokit(accessToken: string): Octokit {
  let client = cache.get(accessToken);
  if (!client) {
    client = new Octokit({ auth: accessToken });
    cache.set(accessToken, client);
  }
  return client;
}

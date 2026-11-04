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

/**
 * Conditional requests: every GET remembers its ETag and response, and asks
 * GitHub again with `If-None-Match`. An unchanged answer comes back as 304,
 * which GitHub doesn't count against the hourly limit (measured on 4 Nov
 * 2026: two 304s for a pulse-fe issues page left `used` unchanged). A board
 * or plan load lists every tracked repo page by page, about 120 requests, so
 * a refresh where nothing changed now costs close to none.
 *
 * Kept per token, because an answer depends on who asks. Pagination works
 * through it: a cached page keeps its `link` header, so the next page's URL
 * is the one cached before. Bounded, oldest entry out first.
 */
const MAX_CACHED_RESPONSES = 2000;

interface CachedResponse {
  etag: string;
  response: { status: number; url: string; headers: Record<string, unknown>; data: unknown };
}

function withConditionalRequests(client: Octokit): Octokit {
  const responses = new Map<string, CachedResponse>();

  client.hook.wrap("request", async (request, options) => {
    let key: string | null = null;
    try {
      const parsed = client.request.endpoint.parse(options);
      // The rate limit is never the same twice, and asking for it is free.
      if (parsed.method === "GET" && !parsed.url.endsWith("/rate_limit")) key = parsed.url;
    } catch {
      key = null;
    }
    const cached = key ? responses.get(key) : undefined;
    if (cached && !options.headers["if-none-match"]) {
      options.headers = { ...options.headers, "if-none-match": cached.etag };
    }

    try {
      const response = await request(options);
      const etag = response.headers.etag;
      if (key && typeof etag === "string") {
        responses.delete(key);
        responses.set(key, { etag, response: { status: response.status, url: response.url, headers: response.headers, data: response.data } });
        if (responses.size > MAX_CACHED_RESPONSES) responses.delete(responses.keys().next().value!);
      }
      return response;
    } catch (error) {
      // Octokit throws on 304: unchanged, so the remembered answer still holds.
      if (cached && key && (error as { status?: number }).status === 304) {
        responses.delete(key);
        responses.set(key, cached);
        return cached.response as Awaited<ReturnType<typeof request>>;
      }
      throw error;
    }
  });
  return client;
}

/** Octokit logs every request that throws as an error, and a 304 throws:
 *  that would be a hundred "errors" per refresh. Real errors still log. */
const log = {
  debug: () => {},
  info: () => {},
  warn: console.warn,
  error: (message: string, ...rest: unknown[]) => {
    if (typeof message === "string" && / - 304 with id /.test(message)) return;
    console.error(message, ...rest);
  },
};

export function getOctokit(accessToken: string): Octokit {
  let client = cache.get(accessToken);
  if (!client) {
    client = withConditionalRequests(new Octokit({ auth: accessToken, log }));
    cache.set(accessToken, client);
  }
  return client;
}

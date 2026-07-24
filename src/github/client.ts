const API_BASE = 'https://api.github.com';

export type GithubErrorKind = 'not-found' | 'rate-limited' | 'upstream';

export class GithubError extends Error {
  constructor(
    public readonly kind: GithubErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'GithubError';
  }
}

export interface GithubClientOptions {
  /** PAT for the shared instance or self-hoster. Optional: public data works unauthenticated at lower limits. */
  token?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

function headers(token: string | undefined, accept: string): Record<string, string> {
  const h: Record<string, string> = {
    accept,
    'user-agent': 'ai-usage-cards',
    'x-github-api-version': '2022-11-28',
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

function toError(status: number, remaining: string | null, body: string): GithubError {
  if (status === 404) return new GithubError('not-found', 'GitHub resource not found');
  if (status === 429 || ((status === 403 || status === 401) && remaining === '0')) {
    return new GithubError('rate-limited', 'GitHub API rate limit exceeded');
  }
  if (status === 403) return new GithubError('rate-limited', 'GitHub API request forbidden');
  return new GithubError('upstream', `GitHub API error ${status}: ${body.slice(0, 200)}`);
}

export async function githubRest<T>(path: string, opts: GithubClientOptions = {}): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(`${API_BASE}${path}`, {
    headers: headers(opts.token, 'application/vnd.github+json'),
  });
  if (!res.ok) {
    throw toError(res.status, res.headers.get('x-ratelimit-remaining'), await res.text());
  }
  return (await res.json()) as T;
}

export async function githubGraphql<T>(query: string, opts: GithubClientOptions = {}): Promise<T> {
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: { ...headers(opts.token, 'application/json'), 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw toError(res.status, res.headers.get('x-ratelimit-remaining'), await res.text());
  }
  const payload = (await res.json()) as { data?: T; errors?: { message: string }[] };
  // Partial responses (e.g. a since-deleted repo) still carry usable data;
  // only fail when GitHub returned no data at all.
  if (!payload.data) {
    throw new GithubError('upstream', payload.errors?.[0]?.message ?? 'Empty GraphQL response');
  }
  return payload.data;
}

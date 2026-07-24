import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TtlCache } from '../src/core/cache.js';
import { GithubError } from '../src/github/client.js';
import { renderBuddyCard } from '../src/render/buddy-card.js';
import { renderErrorCard, renderUsageEmptyCard } from '../src/render/error-card.js';
import { resolveTheme } from '../src/render/themes.js';
import { fetchUsageSources } from '../src/usage/fetch-usage-data.js';
import { mergeSources } from '../src/usage/merge.js';
import type { UsageSourceFile } from '../src/usage/types.js';
import { parseProviders } from './usage-card.js';

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const GIST_RE = /^[0-9a-f]{5,64}$/i;

const sourceCache = new TtlCache<UsageSourceFile[]>(10 * 60 * 1000);

const CACHE_OK = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const CACHE_NOT_FOUND = 'public, max-age=60, s-maxage=300';
const CACHE_TRANSIENT = 'public, max-age=30, s-maxage=60';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function send(res: VercelResponse, svg: string, cacheControl: string): void {
  res.status(200);
  res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
  res.setHeader('cache-control', cacheControl);
  res.send(svg);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const theme = resolveTheme(first(req.query.theme));
  const username = first(req.query.username)?.trim() ?? '';
  const gistId = first(req.query.gist)?.trim() ?? '';
  const providers = parseProviders(first(req.query.providers));

  if (!USERNAME_RE.test(username) || !GIST_RE.test(gistId)) {
    send(res, renderErrorCard('invalid-usage-params', theme), CACHE_NOT_FOUND);
    return;
  }

  try {
    const sources = await sourceCache.getOrCompute(gistId.toLowerCase(), () =>
      fetchUsageSources(gistId, { token: process.env.GITHUB_TOKEN }),
    );
    const data = mergeSources(sources, providers);
    const svg =
      data.days.size === 0
        ? renderUsageEmptyCard(username, theme)
        : renderBuddyCard(username, data, theme);
    send(res, svg, CACHE_OK);
  } catch (err) {
    if (err instanceof GithubError && err.kind === 'not-found') {
      send(res, renderErrorCard('gist-not-found', theme), CACHE_NOT_FOUND);
      return;
    }
    const kind =
      err instanceof GithubError && err.kind === 'rate-limited' ? 'rate-limited' : 'upstream';
    send(res, renderErrorCard(kind, theme), CACHE_TRANSIENT);
  }
}

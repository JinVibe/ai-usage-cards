import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TtlCache } from '../src/core/cache.js';
import type { CardData } from '../src/core/types.js';
import { fetchCardData } from '../src/fetch-card-data.js';
import { GithubError } from '../src/github/client.js';
import { renderCombinedCard } from '../src/render/combined-card.js';
import { renderErrorCard, renderUsageEmptyCard } from '../src/render/error-card.js';
import { resolveTheme } from '../src/render/themes.js';
import { fetchUsageData } from '../src/usage/fetch-usage-data.js';
import type { UsageData } from '../src/usage/types.js';

const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const GIST_RE = /^[0-9a-f]{5,64}$/i;

const outcomeCache = new TtlCache<CardData>(10 * 60 * 1000);
const usageCache = new TtlCache<UsageData>(10 * 60 * 1000);

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

  if (!USERNAME_RE.test(username) || !GIST_RE.test(gistId)) {
    send(res, renderErrorCard('invalid-usage-params', theme), CACHE_NOT_FOUND);
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const [outcomeResult, usageResult] = await Promise.allSettled([
    outcomeCache.getOrCompute(username.toLowerCase(), () => fetchCardData(username, { token })),
    usageCache.getOrCompute(gistId.toLowerCase(), () => fetchUsageData(gistId, { token })),
  ]);

  if (outcomeResult.status === 'rejected' || usageResult.status === 'rejected') {
    const err =
      outcomeResult.status === 'rejected' ? outcomeResult.reason : (usageResult as PromiseRejectedResult).reason;
    if (err instanceof GithubError && err.kind === 'not-found') {
      const kind = outcomeResult.status === 'rejected' ? 'user-not-found' : 'gist-not-found';
      send(res, renderErrorCard(kind, theme), CACHE_NOT_FOUND);
      return;
    }
    const kind =
      err instanceof GithubError && err.kind === 'rate-limited' ? 'rate-limited' : 'upstream';
    send(res, renderErrorCard(kind, theme), CACHE_TRANSIENT);
    return;
  }

  const usage = usageResult.value;
  const svg =
    usage.days.size === 0
      ? renderUsageEmptyCard(username, theme)
      : renderCombinedCard(username, usage, outcomeResult.value, theme, new Date());
  send(res, svg, CACHE_OK);
}

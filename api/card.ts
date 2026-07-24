import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TtlCache } from '../src/core/cache.js';
import type { CardData } from '../src/core/types.js';
import { fetchCardData } from '../src/fetch-card-data.js';
import { GithubError } from '../src/github/client.js';
import { renderCard } from '../src/render/card.js';
import {
  renderEmptyCard,
  renderErrorCard,
  type CardErrorKind,
} from '../src/render/error-card.js';
import { resolveTheme } from '../src/render/themes.js';
import { parseCardParams } from '../src/params.js';

/** Data (not SVG) is memoized, so theme/module variants share one fetch. */
const dataCache = new TtlCache<CardData>(10 * 60 * 1000);

const CACHE_OK = 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400';
const CACHE_NOT_FOUND = 'public, max-age=60, s-maxage=300';
const CACHE_TRANSIENT = 'public, max-age=30, s-maxage=60';

function send(res: VercelResponse, svg: string, cacheControl: string): void {
  // Always HTTP 200 + SVG so the README <img> never breaks.
  res.status(200);
  res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
  res.setHeader('cache-control', cacheControl);
  res.send(svg);
}

function errorKind(err: unknown): CardErrorKind {
  if (err instanceof GithubError) {
    if (err.kind === 'not-found') return 'user-not-found';
    if (err.kind === 'rate-limited') return 'rate-limited';
  }
  return 'upstream';
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const params = parseCardParams(req.query);
  const theme = resolveTheme(params?.theme ?? (req.query.theme as string | undefined));

  if (!params) {
    send(res, renderErrorCard('invalid-username', theme), CACHE_NOT_FOUND);
    return;
  }

  try {
    const data = await dataCache.getOrCompute(params.username.toLowerCase(), () =>
      fetchCardData(params.username, { token: process.env.GITHUB_TOKEN }),
    );
    const svg =
      data.commits === 0
        ? renderEmptyCard(data.username, theme)
        : renderCard(data, theme, params.modules);
    send(res, svg, CACHE_OK);
  } catch (err) {
    const kind = errorKind(err);
    send(
      res,
      renderErrorCard(kind, theme),
      kind === 'user-not-found' ? CACHE_NOT_FOUND : CACHE_TRANSIENT,
    );
  }
}

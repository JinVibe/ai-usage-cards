import { buildCardData, planEnrichment } from './core/aggregate.js';
import type { CardData, Enrichment } from './core/types.js';
import { githubRest, type GithubClientOptions } from './github/client.js';
import { enrichRepos } from './github/enrich.js';
import { searchAiCommits } from './github/search-commits.js';
import type { RestUser } from './github/types.js';

/**
 * Full data pipeline for one user: existence check + commit search (in
 * parallel), then the single batched enrichment query. ≤ 4 GitHub calls.
 */
export async function fetchCardData(
  username: string,
  opts: GithubClientOptions = {},
): Promise<CardData> {
  const [userResult, searchResult] = await Promise.allSettled([
    githubRest<RestUser>(`/users/${encodeURIComponent(username)}`, opts),
    searchAiCommits(username, opts),
  ]);
  // The user lookup is authoritative for 404s — commit search reports unknown
  // users as a generic validation error, so check the user result first.
  if (userResult.status === 'rejected') throw userResult.reason;
  if (searchResult.status === 'rejected') throw searchResult.reason;

  const { commits, truncated } = searchResult.value;

  // Enrichment requires auth (GraphQL) — degrade to commit counts only rather
  // than failing the whole card when it is unavailable.
  let enrichment: Enrichment = { repos: new Map() };
  try {
    enrichment = await enrichRepos(planEnrichment(commits), opts);
  } catch {
    // keep the un-enriched card
  }

  return buildCardData(username, commits, enrichment, { truncated });
}

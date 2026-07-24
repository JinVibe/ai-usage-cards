import { matchAiSignatures } from '../core/trailer.js';
import type { AiCommit } from '../core/types.js';
import { githubRest, type GithubClientOptions } from './client.js';
import type { CommitSearchResponse } from './types.js';

const PER_PAGE = 100;
/** Hard cap: at most 2 search calls per uncached request (≤ 200 commits). */
const MAX_PAGES = 2;

export interface CommitSearchResult {
  commits: AiCommit[];
  /** True when more matching commits exist beyond the page cap. */
  truncated: boolean;
}

/**
 * Discovers the user's AI-assisted commits via one broad commit-search query.
 * The search only matches the generic "Co-authored-by:" phrase; the actual
 * agent-signature matching runs locally on the returned messages, so adding
 * new agents to the registry never adds API calls. Commit search indexes
 * default branches only, so every hit has already landed.
 */
export async function searchAiCommits(
  username: string,
  opts: GithubClientOptions = {},
): Promise<CommitSearchResult> {
  const q = encodeURIComponent(`author:${username} "Co-authored-by:"`);
  const commits: AiCommit[] = [];
  let totalCount = 0;
  let fetched = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await githubRest<CommitSearchResponse>(
      `/search/commits?q=${q}&sort=author-date&order=desc&per_page=${PER_PAGE}&page=${page}`,
      opts,
    );
    totalCount = res.total_count;
    fetched += res.items.length;

    for (const item of res.items) {
      if (item.repository.private) continue;
      const signatureIds = matchAiSignatures(item.commit.message);
      if (signatureIds.length === 0) continue;
      commits.push({
        sha: item.sha,
        repo: item.repository.full_name,
        date: item.commit.author?.date ?? '',
        signatureIds,
      });
    }

    if (res.items.length < PER_PAGE) break;
  }

  return { commits, truncated: totalCount > fetched };
}

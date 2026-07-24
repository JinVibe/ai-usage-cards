import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GithubError } from '../src/github/client.js';
import { buildEnrichmentQuery, enrichRepos } from '../src/github/enrich.js';
import { searchAiCommits } from '../src/github/search-commits.js';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function fakeFetch(status: number, body: string, headers: Record<string, string> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = (async (url: any, init?: any) => {
    calls.push({ url: String(url), init });
    return new Response(body, { status, headers });
  }) as typeof fetch;
  return { impl, calls };
}

describe('searchAiCommits', () => {
  it('filters search hits down to AI-signed public commits', async () => {
    const { impl, calls } = fakeFetch(200, fixture('search-commits.json'));
    const result = await searchAiCommits('octo', { fetchImpl: impl });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain('/search/commits?q=author%3Aocto');
    // 3 hits in the fixture, but the human co-authored one is filtered locally
    expect(result.commits.map((c) => c.sha[0])).toEqual(['a', 'c']);
    expect(result.commits[0]?.repo).toBe('octo/app');
    expect(result.commits[0]?.signatureIds).toEqual(['claude']);
    expect(result.truncated).toBe(false);
  });

  it('throws a typed not-found error for unknown users', async () => {
    const { impl } = fakeFetch(404, '{"message":"Not Found"}');
    await expect(searchAiCommits('ghost', { fetchImpl: impl })).rejects.toMatchObject({
      kind: 'not-found',
    });
  });

  it('throws a typed rate-limited error when the search pool is exhausted', async () => {
    const { impl } = fakeFetch(403, '{"message":"rate limit"}', {
      'x-ratelimit-remaining': '0',
    });
    await expect(searchAiCommits('octo', { fetchImpl: impl })).rejects.toMatchObject({
      kind: 'rate-limited',
    });
  });
});

describe('buildEnrichmentQuery', () => {
  it('batches repos and commit lookups into one query', () => {
    const query = buildEnrichmentQuery([
      { repo: 'octo/app', shas: ['a'.repeat(40), 'b'.repeat(40)] },
      { repo: 'octo/lib', shas: ['c'.repeat(40)] },
    ]);
    expect(query).toContain('r0: repository(owner: "octo", name: "app")');
    expect(query).toContain('r1: repository(owner: "octo", name: "lib")');
    expect(query).toContain('releases { totalCount }');
    expect(query.match(/associatedPullRequests/g)).toHaveLength(3);
  });

  it('drops entries with unsafe owner, name, or sha values', () => {
    const query = buildEnrichmentQuery([
      { repo: 'octo/app"){x}', shas: ['a'.repeat(40)] },
      { repo: 'octo/ok', shas: ['not a sha") {'] },
    ]);
    expect(query).not.toContain('x}');
    expect(query).not.toContain('not a sha');
    expect(query).toContain('r1: repository(owner: "octo", name: "ok")');
  });
});

describe('enrichRepos', () => {
  it('maps the GraphQL response back to repo enrichments', async () => {
    const { impl } = fakeFetch(200, fixture('enrich.json'));
    const enrichment = await enrichRepos(
      [
        { repo: 'octo/app', shas: ['a'.repeat(40), 'b'.repeat(40)] },
        { repo: 'octo/lib', shas: ['c'.repeat(40)] },
      ],
      { fetchImpl: impl },
    );

    const app = enrichment.repos.get('octo/app');
    expect(app?.releaseCount).toBe(2);
    expect(app?.latestReleaseTag).toBe('v1.2.0');
    expect(app?.mergedPrNumbers).toEqual([41, 41]); // deduped later in aggregation
    // octo/lib's only PR is unmerged
    expect(enrichment.repos.get('octo/lib')?.mergedPrNumbers).toEqual([]);
  });

  it('skips the API call entirely for an empty plan', async () => {
    const { impl, calls } = fakeFetch(200, '{}');
    const enrichment = await enrichRepos([], { fetchImpl: impl });
    expect(calls).toHaveLength(0);
    expect(enrichment.repos.size).toBe(0);
  });

  it('surfaces empty GraphQL responses as upstream errors', async () => {
    const { impl } = fakeFetch(200, '{"errors":[{"message":"boom"}]}');
    await expect(
      enrichRepos([{ repo: 'octo/app', shas: [] }], { fetchImpl: impl }),
    ).rejects.toBeInstanceOf(GithubError);
  });
});

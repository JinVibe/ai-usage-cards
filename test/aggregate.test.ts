import { describe, expect, it } from 'vitest';
import {
  MAX_ENRICHED_REPOS,
  MAX_SAMPLED_COMMITS_PER_REPO,
  buildCardData,
  planEnrichment,
} from '../src/core/aggregate.js';
import type { AiCommit, Enrichment } from '../src/core/types.js';

function commit(repo: string, sha: string, date = '2026-07-01T00:00:00Z'): AiCommit {
  return { sha, repo, date, signatureIds: ['claude'] };
}

function manyCommits(repo: string, count: number): AiCommit[] {
  return Array.from({ length: count }, (_, i) =>
    commit(repo, `${repo.replace('/', '-')}-sha${i}`, `2026-07-${String((i % 27) + 1).padStart(2, '0')}T00:00:00Z`),
  );
}

describe('planEnrichment', () => {
  it('caps repos and per-repo commit samples', () => {
    const commits = Array.from({ length: 12 }, (_, r) => manyCommits(`u/repo${r}`, 20)).flat();
    const plan = planEnrichment(commits);
    expect(plan).toHaveLength(MAX_ENRICHED_REPOS);
    for (const entry of plan) {
      expect(entry.shas.length).toBeLessThanOrEqual(MAX_SAMPLED_COMMITS_PER_REPO);
    }
  });

  it('ranks repos by AI-commit count', () => {
    const commits = [...manyCommits('u/small', 2), ...manyCommits('u/big', 5)];
    const plan = planEnrichment(commits);
    expect(plan[0]?.repo).toBe('u/big');
    expect(plan[1]?.repo).toBe('u/small');
  });

  it('samples the most recent commits first', () => {
    const commits = [
      commit('u/r', 'old', '2026-01-01T00:00:00Z'),
      commit('u/r', 'new', '2026-07-01T00:00:00Z'),
    ];
    const plan = planEnrichment(commits);
    expect(plan[0]?.shas[0]).toBe('new');
  });
});

describe('buildCardData', () => {
  const commits = [
    commit('u/app', 'a1'),
    commit('u/app', 'a2'),
    commit('u/lib', 'b1'),
  ];
  const enrichment: Enrichment = {
    repos: new Map([
      ['u/app', { releaseCount: 2, latestReleaseTag: 'v1.2.0', mergedPrNumbers: [10, 10, 11] }],
      ['u/lib', { releaseCount: 0, latestReleaseTag: null, mergedPrNumbers: [3] }],
    ]),
  };

  it('counts commits, distinct merged PRs, and releases', () => {
    const data = buildCardData('u', commits, enrichment);
    expect(data.commits).toBe(3);
    expect(data.mergedPrs).toBe(3); // {10, 11} + {3}, PR 10 deduped
    expect(data.releases).toBe(2);
    expect(data.repoCount).toBe(2);
  });

  it('builds top repo case rows with release tags', () => {
    const data = buildCardData('u', commits, enrichment);
    expect(data.repoCases[0]).toEqual({ repo: 'u/app', commits: 2, latestReleaseTag: 'v1.2.0' });
    expect(data.repoCases[1]).toEqual({ repo: 'u/lib', commits: 1, latestReleaseTag: null });
  });

  it('caps case rows at three', () => {
    const wide = ['u/a', 'u/b', 'u/c', 'u/d'].flatMap((r) => manyCommits(r, 2));
    const data = buildCardData('u', wide, { repos: new Map() });
    expect(data.repoCases).toHaveLength(3);
  });

  it('handles zero commits', () => {
    const data = buildCardData('u', [], { repos: new Map() });
    expect(data.commits).toBe(0);
    expect(data.mergedPrs).toBe(0);
    expect(data.releases).toBe(0);
    expect(data.repoCases).toEqual([]);
  });

  it('ignores enrichment for repos not in the commit set', () => {
    const stray: Enrichment = {
      repos: new Map([['u/other', { releaseCount: 9, latestReleaseTag: 'v9', mergedPrNumbers: [1] }]]),
    };
    const data = buildCardData('u', commits, stray);
    expect(data.mergedPrs).toBe(0);
    expect(data.releases).toBe(0);
  });
});

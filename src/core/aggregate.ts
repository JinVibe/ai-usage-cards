import type { AiCommit, CardData, Enrichment, RepoCase } from './types.js';

/** Caps that bound the single GraphQL enrichment query (≤ 64 commit aliases). */
export const MAX_ENRICHED_REPOS = 8;
export const MAX_SAMPLED_COMMITS_PER_REPO = 8;
export const MAX_REPO_CASE_ROWS = 3;

export interface EnrichmentPlan {
  repo: string;
  shas: string[];
}

function groupByRepo(commits: AiCommit[]): Map<string, AiCommit[]> {
  const byRepo = new Map<string, AiCommit[]>();
  for (const commit of commits) {
    const list = byRepo.get(commit.repo);
    if (list) list.push(commit);
    else byRepo.set(commit.repo, [commit]);
  }
  return byRepo;
}

function reposByCommitCount(byRepo: Map<string, AiCommit[]>): string[] {
  return [...byRepo.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([repo]) => repo);
}

/**
 * Chooses which repos and commits the batched GraphQL query should enrich:
 * the top repos by AI-commit count, sampling the most recent commits of each.
 */
export function planEnrichment(commits: AiCommit[]): EnrichmentPlan[] {
  const byRepo = groupByRepo(commits);
  return reposByCommitCount(byRepo)
    .slice(0, MAX_ENRICHED_REPOS)
    .map((repo) => {
      const repoCommits = [...(byRepo.get(repo) ?? [])].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      return {
        repo,
        shas: repoCommits.slice(0, MAX_SAMPLED_COMMITS_PER_REPO).map((c) => c.sha),
      };
    });
}

/** Combines search results and enrichment into the render-ready card data. */
export function buildCardData(
  username: string,
  commits: AiCommit[],
  enrichment: Enrichment,
  options: { truncated?: boolean } = {},
): CardData {
  const byRepo = groupByRepo(commits);
  const rankedRepos = reposByCommitCount(byRepo);

  let mergedPrs = 0;
  let releases = 0;
  for (const [repo, info] of enrichment.repos) {
    if (!byRepo.has(repo)) continue;
    mergedPrs += new Set(info.mergedPrNumbers).size;
    releases += info.releaseCount;
  }

  const repoCases: RepoCase[] = rankedRepos.slice(0, MAX_REPO_CASE_ROWS).map((repo) => ({
    repo,
    commits: byRepo.get(repo)?.length ?? 0,
    latestReleaseTag: enrichment.repos.get(repo)?.latestReleaseTag ?? null,
  }));

  const byAgent = new Map<string, number>();
  for (const commit of commits) {
    for (const id of commit.signatureIds) {
      byAgent.set(id, (byAgent.get(id) ?? 0) + 1);
    }
  }
  const agentCounts = [...byAgent.entries()]
    .map(([id, count]) => ({ id, commits: count }))
    .sort((a, b) => b.commits - a.commits || a.id.localeCompare(b.id));

  return {
    username,
    commits: commits.length,
    mergedPrs,
    releases,
    repoCount: byRepo.size,
    repoCases,
    agentCounts,
    truncated: options.truncated ?? false,
  };
}

import type { EnrichmentPlan } from '../core/aggregate.js';
import type { Enrichment, RepoEnrichment } from '../core/types.js';
import { githubGraphql, type GithubClientOptions } from './client.js';
import type { EnrichmentResponse, GraphqlCommitNode, GraphqlRepoNode } from './types.js';

const NAME_RE = /^[A-Za-z0-9_.-]+$/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Builds the single batched GraphQL query that enriches all sampled repos and
 * commits at once: release counts, latest release tag, and the merged PRs
 * associated with each sampled commit. One API call regardless of repo count.
 */
export function buildEnrichmentQuery(plan: EnrichmentPlan[]): string {
  const parts: string[] = [];
  plan.forEach((entry, repoIndex) => {
    const [owner, name] = entry.repo.split('/');
    if (!owner || !name || !NAME_RE.test(owner) || !NAME_RE.test(name)) return;
    const commitFields = entry.shas
      .filter((sha) => SHA_RE.test(sha))
      .map(
        (sha, commitIndex) => `
      c${commitIndex}: object(oid: "${sha}") {
        ... on Commit {
          associatedPullRequests(first: 1) { nodes { number merged } }
        }
      }`,
      )
      .join('');
    parts.push(`
  r${repoIndex}: repository(owner: "${owner}", name: "${name}") {
    releases { totalCount }
    latestRelease { tagName }${commitFields}
  }`);
  });
  return `query {${parts.join('')}\n}`;
}

function parseRepoNode(node: GraphqlRepoNode): RepoEnrichment {
  const mergedPrNumbers: number[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (!key.startsWith('c')) continue;
    const commit = value as GraphqlCommitNode | null;
    for (const pr of commit?.associatedPullRequests?.nodes ?? []) {
      if (pr.merged) mergedPrNumbers.push(pr.number);
    }
  }
  return {
    releaseCount: node.releases?.totalCount ?? 0,
    latestReleaseTag: node.latestRelease?.tagName ?? null,
    mergedPrNumbers,
  };
}

/** Runs the batched query and maps aliases back to "owner/name" keys. */
export async function enrichRepos(
  plan: EnrichmentPlan[],
  opts: GithubClientOptions = {},
): Promise<Enrichment> {
  const repos = new Map<string, RepoEnrichment>();
  if (plan.length === 0) return { repos };

  const data = await githubGraphql<EnrichmentResponse>(buildEnrichmentQuery(plan), opts);
  plan.forEach((entry, repoIndex) => {
    const node = data[`r${repoIndex}`];
    if (node) repos.set(entry.repo, parseRepoNode(node));
  });
  return { repos };
}

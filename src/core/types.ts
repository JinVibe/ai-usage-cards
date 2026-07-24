/** Normalized domain types shared by aggregation, enrichment, and rendering. */

/** A public commit confirmed (locally) to carry an AI co-author trailer. */
export interface AiCommit {
  sha: string;
  /** "owner/name" */
  repo: string;
  /** ISO author date */
  date: string;
  /** Matched signature ids from the registry, e.g. ["claude"] */
  signatureIds: string[];
}

/** Result of the single batched GraphQL enrichment query. */
export interface Enrichment {
  /** Keyed by "owner/name" for repos that were enriched. */
  repos: Map<string, RepoEnrichment>;
}

export interface RepoEnrichment {
  releaseCount: number;
  latestReleaseTag: string | null;
  /** Merged PR numbers found via sampled commits' associated PRs. */
  mergedPrNumbers: number[];
}

/** Everything the card renderer needs. Contains no emails by construction. */
export interface CardData {
  username: string;
  /** Total AI-assisted commits found (rendered as "≥N"). */
  commits: number;
  /** Distinct merged PRs containing those commits (rendered as "≥M"). */
  mergedPrs: number;
  /** Releases across repos with AI-assisted commits. */
  releases: number;
  /** Distinct repos with AI-assisted commits. */
  repoCount: number;
  /** Top repos for the opt-in "repos" module, best first. */
  repoCases: RepoCase[];
  /** True when the commit search was truncated at the page cap. */
  truncated: boolean;
}

export interface RepoCase {
  /** "owner/name" */
  repo: string;
  commits: number;
  latestReleaseTag: string | null;
}

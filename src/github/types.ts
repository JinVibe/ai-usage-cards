/** Raw GitHub API response shapes (only the fields this project reads). */

export interface RestUser {
  login: string;
}

export interface CommitSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: CommitSearchItem[];
}

export interface CommitSearchItem {
  sha: string;
  commit: {
    message: string;
    author: { date: string } | null;
  };
  repository: {
    full_name: string;
    private: boolean;
  };
}

export interface GraphqlCommitNode {
  associatedPullRequests: {
    nodes: { number: number; merged: boolean }[];
  } | null;
}

export interface GraphqlRepoNode {
  releases: { totalCount: number };
  latestRelease: { tagName: string } | null;
  [commitAlias: string]: unknown;
}

export type EnrichmentResponse = Record<string, GraphqlRepoNode | null>;

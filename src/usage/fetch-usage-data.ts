import { githubRest, type GithubClientOptions } from '../github/client.js';
import { mergeSources, parseSourceFile } from './merge.js';
import type { UsageData, UsageSourceFile } from './types.js';

interface GistResponse {
  files: Record<string, { filename: string; content: string; truncated: boolean } | null>;
}

/**
 * Fetches a usage gist and parses every valid per-source JSON file in it.
 * One GitHub call. Malformed files are skipped silently so one broken
 * collector never blanks the whole card. Handlers cache this raw result per
 * gist and merge per request, so provider-filter variants share one fetch.
 */
export async function fetchUsageSources(
  gistId: string,
  opts: GithubClientOptions = {},
): Promise<UsageSourceFile[]> {
  const gist = await githubRest<GistResponse>(`/gists/${encodeURIComponent(gistId)}`, opts);
  const sources: UsageSourceFile[] = [];
  for (const file of Object.values(gist.files ?? {})) {
    if (!file || !file.filename.endsWith('.json') || file.truncated) continue;
    let json: unknown;
    try {
      json = JSON.parse(file.content);
    } catch {
      continue;
    }
    const parsed = parseSourceFile(json);
    if (parsed) sources.push(parsed);
  }
  return sources;
}

/** Convenience wrapper: fetch + merge, optionally narrowed to `providers`. */
export async function fetchUsageData(
  gistId: string,
  opts: GithubClientOptions = {},
  providers?: string[],
): Promise<UsageData> {
  return mergeSources(await fetchUsageSources(gistId, opts), providers);
}

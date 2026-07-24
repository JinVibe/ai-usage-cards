import { githubRest, type GithubClientOptions } from '../github/client.js';
import { mergeSources, parseSourceFile } from './merge.js';
import type { UsageData } from './types.js';

interface GistResponse {
  files: Record<string, { filename: string; content: string; truncated: boolean } | null>;
}

/**
 * Fetches a usage gist and merges every valid per-source JSON file in it.
 * One GitHub call. Malformed files are skipped silently so one broken
 * collector never blanks the whole card.
 */
export async function fetchUsageData(
  gistId: string,
  opts: GithubClientOptions = {},
): Promise<UsageData> {
  const gist = await githubRest<GistResponse>(`/gists/${encodeURIComponent(gistId)}`, opts);
  const sources = [];
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
  return mergeSources(sources);
}

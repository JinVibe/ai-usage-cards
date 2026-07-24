import type { UsageData, UsageDailyEntry, UsageSourceFile } from './types.js';

export const USAGE_SCHEMA_VERSION = 1;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asNonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Schema guard for one gist file. Returns null for anything that is not a
 * well-formed v1 source file — a malformed or future-versioned file is
 * skipped, never an error (other sources still render).
 */
export function parseSourceFile(json: unknown): UsageSourceFile | null {
  if (typeof json !== 'object' || json === null) return null;
  const obj = json as Record<string, unknown>;
  if (obj.schema_version !== USAGE_SCHEMA_VERSION) return null;
  if (!Array.isArray(obj.daily)) return null;

  const daily: UsageDailyEntry[] = [];
  for (const raw of obj.daily) {
    if (typeof raw !== 'object' || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    if (typeof entry.date !== 'string' || !DATE_RE.test(entry.date)) continue;
    if (typeof entry.provider !== 'string' || entry.provider === '') continue;
    daily.push({
      date: entry.date,
      provider: entry.provider,
      sessions: asNonNegative(entry.sessions),
      input_tokens: asNonNegative(entry.input_tokens),
      output_tokens: asNonNegative(entry.output_tokens),
      top_model: typeof entry.top_model === 'string' ? entry.top_model : undefined,
    });
  }

  return {
    schema_version: USAGE_SCHEMA_VERSION,
    source_id: typeof obj.source_id === 'string' ? obj.source_id : '',
    updated_at: typeof obj.updated_at === 'string' ? obj.updated_at : '',
    daily,
  };
}

function entryTokens(entry: UsageDailyEntry): number {
  return (entry.input_tokens ?? 0) + (entry.output_tokens ?? 0);
}

/**
 * Merges all source files: identical date+provider entries from different
 * sources are summed (two machines, one account), then collapsed into
 * per-day and per-provider aggregates.
 */
export function mergeSources(files: UsageSourceFile[]): UsageData {
  const days = new Map<string, { tokens: number; sessions: number }>();
  const providerTokens = new Map<string, number>();
  const modelTokens = new Map<string, number>();

  for (const file of files) {
    for (const entry of file.daily) {
      const tokens = entryTokens(entry);
      const day = days.get(entry.date) ?? { tokens: 0, sessions: 0 };
      day.tokens += tokens;
      day.sessions += entry.sessions ?? 0;
      days.set(entry.date, day);

      providerTokens.set(entry.provider, (providerTokens.get(entry.provider) ?? 0) + tokens);
      if (entry.top_model) {
        modelTokens.set(entry.top_model, (modelTokens.get(entry.top_model) ?? 0) + tokens);
      }
    }
  }

  const providers = [...providerTokens.entries()]
    .map(([provider, tokens]) => ({ provider, tokens }))
    .filter((p) => p.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens || a.provider.localeCompare(b.provider));

  let topModel: string | null = null;
  let best = 0;
  for (const [model, tokens] of modelTokens) {
    if (tokens > best) {
      best = tokens;
      topModel = model;
    }
  }

  return { days, providers, topModel };
}

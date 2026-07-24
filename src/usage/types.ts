/**
 * Layer 2 domain types: local AI usage stats collected per source
 * (tool × account × machine) into one gist file each, merged at render time.
 *
 * Privacy: only numeric aggregates ever leave the user's machine. Source ids
 * are user-chosen labels used for file naming and are NEVER rendered.
 */

export interface UsageSourceFile {
  schema_version: number;
  source_id: string;
  updated_at: string;
  daily: UsageDailyEntry[];
}

export interface UsageDailyEntry {
  /** YYYY-MM-DD in the collector's local timezone. */
  date: string;
  /** e.g. "claude-code", "codex", "gemini-cli" */
  provider: string;
  sessions?: number;
  input_tokens?: number;
  output_tokens?: number;
  top_model?: string;
}

/** Merged view across all sources, ready for rendering. */
export interface UsageData {
  /** Total tokens and sessions per date (all providers summed). */
  days: Map<string, { tokens: number; sessions: number }>;
  /** Per-provider token totals, largest first. */
  providers: { provider: string; tokens: number }[];
  /** Most-used model across sources, weighted by tokens. */
  topModel: string | null;
}

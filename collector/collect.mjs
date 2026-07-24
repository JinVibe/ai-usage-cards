#!/usr/bin/env node
/**
 * ai-usage-cards collector — run this on each machine (cron or a Claude Code
 * hook). It wraps ccusage (never parses logs itself), normalizes the daily
 * report to the v1 schema, and updates ONLY its own file in your gist, so
 * multiple machines never conflict.
 *
 * Required environment:
 *   AIUC_GIST_ID    id of a gist you own (secret gists work)
 *   AIUC_GIST_TOKEN GitHub PAT with only the `gist` scope
 *   AIUC_SOURCE_ID  a label for this machine, e.g. "macbook-personal".
 *                   Used only as the gist filename — never rendered.
 * Optional:
 *   AIUC_PROVIDER   provider id recorded in entries (default "claude-code")
 *   AIUC_CMD        collector command (default "npx -y ccusage daily --json")
 *
 * Privacy: only the numeric summaries below ever leave this machine — no
 * project names, file paths, prompts, or costs.
 */
import { execSync } from 'node:child_process';

const SCHEMA_VERSION = 1;

/** Normalizes `ccusage daily --json` output to v1 daily entries. */
export function normalizeCcusageDaily(report, provider) {
  const rows = Array.isArray(report?.daily) ? report.daily : [];
  const entries = [];
  for (const row of rows) {
    if (typeof row?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    const models = Array.isArray(row.modelsUsed) ? row.modelsUsed : [];
    entries.push({
      date: row.date,
      provider,
      input_tokens: toCount(row.inputTokens),
      output_tokens: toCount(row.outputTokens),
      top_model: typeof models[0] === 'string' ? shortModelName(models[0]) : undefined,
    });
  }
  return entries;
}

function toCount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/** "claude-opus-4-8" → "opus"; unknown ids pass through untouched. */
export function shortModelName(model) {
  const match = /(opus|sonnet|haiku|fable)/i.exec(model);
  return match ? match[1].toLowerCase() : model;
}

async function updateGist({ gistId, token, sourceId, entries }) {
  const body = {
    files: {
      [`${sourceId}.json`]: {
        content: JSON.stringify(
          {
            schema_version: SCHEMA_VERSION,
            source_id: sourceId,
            updated_at: new Date().toISOString(),
            daily: entries,
          },
          null,
          2,
        ),
      },
    },
  };
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'ai-usage-cards-collector',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gist update failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

async function main() {
  const gistId = process.env.AIUC_GIST_ID;
  const token = process.env.AIUC_GIST_TOKEN;
  const sourceId = process.env.AIUC_SOURCE_ID;
  if (!gistId || !token || !sourceId) {
    console.error('Set AIUC_GIST_ID, AIUC_GIST_TOKEN, and AIUC_SOURCE_ID. See collector/collect.mjs header.');
    process.exit(1);
  }
  if (!/^[A-Za-z0-9._-]+$/.test(sourceId)) {
    console.error('AIUC_SOURCE_ID may only contain letters, digits, ".", "_", "-".');
    process.exit(1);
  }

  const provider = process.env.AIUC_PROVIDER ?? 'claude-code';
  const cmd = process.env.AIUC_CMD ?? 'npx -y ccusage daily --json';
  console.log(`Running: ${cmd}`);
  const raw = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 });
  const entries = normalizeCcusageDaily(JSON.parse(raw), provider);
  if (entries.length === 0) {
    console.error('ccusage returned no daily data — nothing uploaded.');
    process.exit(1);
  }

  await updateGist({ gistId, token, sourceId, entries });
  console.log(`Uploaded ${entries.length} days as ${sourceId}.json`);
  console.log(`Card: https://ai-usage-cards-swart.vercel.app/api/usage-card?username=<login>&gist=${gistId}`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

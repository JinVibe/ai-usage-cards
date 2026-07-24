import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain-JS collector script, exports tested here
import { normalizeCcusageDaily, shortModelName } from '../collector/collect.mjs';
import { parseSourceFile } from '../src/usage/merge.js';

const ccusageReport = {
  daily: [
    {
      date: '2026-07-23',
      inputTokens: 120000,
      outputTokens: 45000,
      totalTokens: 165000,
      totalCost: 12.34,
      modelsUsed: ['claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    },
    { date: 'not-a-date', inputTokens: 1 },
  ],
};

describe('normalizeCcusageDaily', () => {
  const entries = normalizeCcusageDaily(ccusageReport, 'claude-code');

  it('maps valid rows and drops malformed ones', () => {
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      date: '2026-07-23',
      provider: 'claude-code',
      input_tokens: 120000,
      output_tokens: 45000,
      top_model: 'opus',
    });
  });

  it('never carries cost fields through', () => {
    expect(JSON.stringify(entries)).not.toMatch(/cost|\$/i);
  });

  it('produces entries the server-side schema guard accepts', () => {
    const file = {
      schema_version: 1,
      source_id: 'test-machine',
      updated_at: '2026-07-24T00:00:00Z',
      daily: entries,
    };
    expect(parseSourceFile(file)?.daily).toHaveLength(1);
  });

  it('handles an empty or malformed report', () => {
    expect(normalizeCcusageDaily({}, 'claude-code')).toEqual([]);
    expect(normalizeCcusageDaily(null, 'claude-code')).toEqual([]);
  });
});

describe('shortModelName', () => {
  it('shortens known Claude model ids', () => {
    expect(shortModelName('claude-opus-4-8')).toBe('opus');
    expect(shortModelName('claude-fable-5')).toBe('fable');
  });

  it('passes unknown models through', () => {
    expect(shortModelName('gpt-5-codex')).toBe('gpt-5-codex');
  });
});

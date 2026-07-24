import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain-JS collector script, exports tested here
import { normalizeCcusageDaily, providerOfModel, shortModelName } from '../collector/collect.mjs';
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

describe('normalizeCcusageDaily with the current period-based shape', () => {
  const modernReport = {
    daily: [
      {
        period: '2026-07-24',
        agent: 'all',
        inputTokens: 50000,
        outputTokens: 6000,
        totalCost: 1.23,
        modelsUsed: ['claude-fable-5', 'gemini-3-flash-preview'],
        modelBreakdowns: [
          { modelName: 'claude-fable-5', inputTokens: 40000, outputTokens: 5000, cost: 1.1 },
          { modelName: 'gemini-3-flash-preview', inputTokens: 10000, outputTokens: 1000, cost: 0.13 },
        ],
      },
    ],
  };

  it('reads period dates and splits providers by model', () => {
    const entries = normalizeCcusageDaily(modernReport, 'claude-code');
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({
      date: '2026-07-24',
      provider: 'claude-code',
      input_tokens: 40000,
      output_tokens: 5000,
      top_model: 'fable',
    });
    expect(entries).toContainEqual({
      date: '2026-07-24',
      provider: 'gemini-cli',
      input_tokens: 10000,
      output_tokens: 1000,
      top_model: 'gemini-3-flash-preview',
    });
  });

  it('still never carries cost through', () => {
    expect(JSON.stringify(normalizeCcusageDaily(modernReport, 'claude-code'))).not.toMatch(/cost/i);
  });
});

describe('providerOfModel', () => {
  it('classifies known model families', () => {
    expect(providerOfModel('claude-opus-4-8', 'x')).toBe('claude-code');
    expect(providerOfModel('gemini-3-flash-preview', 'x')).toBe('gemini-cli');
    expect(providerOfModel('gpt-5-codex', 'x')).toBe('codex');
    expect(providerOfModel('mystery-model', 'fallback')).toBe('fallback');
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

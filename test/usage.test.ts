import { describe, expect, it } from 'vitest';
import { mergeSources, parseSourceFile } from '../src/usage/merge.js';
import {
  currentStreak,
  formatTokens,
  heatmapGrid,
  monthTotals,
  monthlyTotals,
  totalTokens,
} from '../src/usage/stats.js';
import type { UsageData, UsageSourceFile } from '../src/usage/types.js';

const validFile = {
  schema_version: 1,
  source_id: 'macbook-personal',
  updated_at: '2026-07-24T09:00:00Z',
  daily: [
    { date: '2026-07-23', provider: 'claude-code', sessions: 4, input_tokens: 120000, output_tokens: 45000, top_model: 'opus' },
    { date: '2026-07-24', provider: 'claude-code', sessions: 2, input_tokens: 30000, output_tokens: 10000, top_model: 'opus' },
  ],
};

describe('parseSourceFile', () => {
  it('accepts a well-formed v1 file', () => {
    const parsed = parseSourceFile(validFile);
    expect(parsed?.daily).toHaveLength(2);
  });

  it('rejects wrong schema versions and junk', () => {
    expect(parseSourceFile({ ...validFile, schema_version: 2 })).toBeNull();
    expect(parseSourceFile('not json object')).toBeNull();
    expect(parseSourceFile(null)).toBeNull();
    expect(parseSourceFile({ schema_version: 1 })).toBeNull();
  });

  it('drops malformed entries but keeps good ones', () => {
    const parsed = parseSourceFile({
      ...validFile,
      daily: [
        validFile.daily[0],
        { date: 'yesterday', provider: 'claude-code' },
        { date: '2026-07-22', provider: '' },
        { date: '2026-07-21', provider: 'codex', input_tokens: -5, output_tokens: 100 },
      ],
    });
    expect(parsed?.daily).toHaveLength(2);
    expect(parsed?.daily[1]).toMatchObject({ provider: 'codex', input_tokens: 0, output_tokens: 100 });
  });
});

describe('mergeSources', () => {
  const fileA = parseSourceFile(validFile) as UsageSourceFile;
  const fileB = parseSourceFile({
    ...validFile,
    source_id: 'work-desktop',
    daily: [
      { date: '2026-07-23', provider: 'claude-code', sessions: 1, input_tokens: 10000, output_tokens: 5000, top_model: 'opus' },
      { date: '2026-07-23', provider: 'codex', sessions: 2, input_tokens: 40000, output_tokens: 20000, top_model: 'gpt-5' },
    ],
  }) as UsageSourceFile;

  it('sums identical date+provider entries across sources', () => {
    const merged = mergeSources([fileA, fileB]);
    expect(merged.days.get('2026-07-23')).toEqual({ tokens: 240000, sessions: 7 });
  });

  it('ranks providers by tokens', () => {
    const merged = mergeSources([fileA, fileB]);
    expect(merged.providers.map((p) => p.provider)).toEqual(['claude-code', 'codex']);
  });

  it('picks the token-weighted top model', () => {
    expect(mergeSources([fileA, fileB]).topModel).toBe('opus');
  });

  it('handles no sources', () => {
    const merged = mergeSources([]);
    expect(merged.days.size).toBe(0);
    expect(merged.providers).toEqual([]);
    expect(merged.topModel).toBeNull();
  });

  it('narrows to the requested providers only', () => {
    const merged = mergeSources([fileA, fileB], ['codex']);
    expect(merged.providers.map((p) => p.provider)).toEqual(['codex']);
    expect(merged.days.get('2026-07-23')).toEqual({ tokens: 60000, sessions: 2 });
    expect(merged.topModel).toBe('gpt-5');
  });

  it('treats an empty provider filter as "all"', () => {
    expect(mergeSources([fileA, fileB], []).providers).toHaveLength(2);
  });
});

describe('formatTokens', () => {
  it('abbreviates with one decimal below 100', () => {
    expect(formatTokens(4_213_000)).toBe('4.2M');
    expect(formatTokens(890_000)).toBe('890k');
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(1_500_000_000)).toBe('1.5B');
    expect(formatTokens(0)).toBe('0');
  });
});

function usageWith(days: Record<string, number>): UsageData {
  return {
    days: new Map(Object.entries(days).map(([date, tokens]) => [date, { tokens, sessions: 1 }])),
    providers: [],
    topModel: null,
  };
}

describe('monthTotals', () => {
  it('sums only the current calendar month', () => {
    const data = usageWith({ '2026-07-01': 100, '2026-07-24': 50, '2026-06-30': 999 });
    expect(monthTotals(data, new Date('2026-07-24T12:00:00Z'))).toEqual({ tokens: 150, sessions: 2 });
  });
});

describe('totalTokens', () => {
  it('sums every recorded day', () => {
    expect(totalTokens(usageWith({ '2026-01-01': 100, '2026-07-24': 50 }))).toBe(150);
    expect(totalTokens(usageWith({}))).toBe(0);
  });
});

describe('monthlyTotals', () => {
  it('returns the last N calendar months oldest-first, including empty ones', () => {
    const data = usageWith({ '2026-07-10': 700, '2026-07-20': 30, '2026-05-01': 500, '2025-12-31': 999 });
    const months = monthlyTotals(data, new Date('2026-07-24T12:00:00Z'), 6);
    expect(months.map((m) => m.label)).toEqual(['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']);
    expect(months[3]).toEqual({ label: 'May', tokens: 500 });
    expect(months[5]).toEqual({ label: 'Jul', tokens: 730 });
    expect(months[0]).toEqual({ label: 'Feb', tokens: 0 });
  });

  it('spans year boundaries', () => {
    const months = monthlyTotals(usageWith({ '2025-12-15': 42 }), new Date('2026-01-10T12:00:00Z'), 2);
    expect(months).toEqual([
      { label: 'Dec', tokens: 42 },
      { label: 'Jan', tokens: 0 },
    ]);
  });
});

describe('currentStreak', () => {
  it('counts consecutive active days ending today', () => {
    const data = usageWith({ '2026-07-22': 1, '2026-07-23': 1, '2026-07-24': 1 });
    expect(currentStreak(data, new Date('2026-07-24T12:00:00Z'))).toBe(3);
  });

  it("tolerates today's collector not having run yet", () => {
    const data = usageWith({ '2026-07-22': 1, '2026-07-23': 1 });
    expect(currentStreak(data, new Date('2026-07-24T12:00:00Z'))).toBe(2);
  });

  it('breaks on a gap', () => {
    const data = usageWith({ '2026-07-20': 1, '2026-07-23': 1 });
    expect(currentStreak(data, new Date('2026-07-24T12:00:00Z'))).toBe(1);
  });

  it('is zero with no recent activity', () => {
    expect(currentStreak(usageWith({}), new Date('2026-07-24T12:00:00Z'))).toBe(0);
  });
});

describe('heatmapGrid', () => {
  const now = new Date('2026-07-24T12:00:00Z'); // a Friday

  it('produces the requested number of week columns of 7 days', () => {
    const grid = heatmapGrid(usageWith({}), now, 26);
    expect(grid).toHaveLength(26);
    for (const col of grid) expect(col).toHaveLength(7);
  });

  it('ends in the week containing now', () => {
    const grid = heatmapGrid(usageWith({}), now, 4);
    const lastCol = grid[grid.length - 1]!;
    expect(lastCol[5]!.date).toBe('2026-07-24');
  });

  it('scales levels 1..4 against the window max and 0 for idle days', () => {
    const grid = heatmapGrid(
      usageWith({ '2026-07-24': 1000, '2026-07-23': 250, '2026-07-22': 10 }),
      now,
      4,
    );
    const lastCol = grid[grid.length - 1]!;
    expect(lastCol[5]!.level).toBe(4); // max day
    expect(lastCol[4]!.level).toBe(1); // 250/1000
    expect(lastCol[3]!.level).toBe(1); // tiny but active
    expect(lastCol[2]!.level).toBe(0); // idle
  });
});

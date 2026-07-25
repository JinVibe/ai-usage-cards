import { describe, expect, it } from 'vitest';
import { COMBINED_CARD_HEIGHT, renderCombinedCard } from '../src/render/combined-card.js';
import { resolveTheme } from '../src/render/themes.js';
import type { CardData } from '../src/core/types.js';
import type { UsageData } from '../src/usage/types.js';

const now = new Date('2026-07-24T12:00:00Z');
const light = resolveTheme('light');

const usage: UsageData = {
  days: new Map([
    ['2026-07-23', { tokens: 800_000, sessions: 5 }],
    ['2026-07-24', { tokens: 150_000, sessions: 2 }],
  ]),
  providers: [{ provider: 'claude-code', tokens: 950_000 }],
  topModel: 'opus',
};

const outcome: CardData = {
  username: 'octo',
  commits: 42,
  mergedPrs: 17,
  releases: 3,
  repoCount: 4,
  repoCases: [],
  agentCounts: [{ id: 'claude', commits: 42 }],
  truncated: false,
};

describe('renderCombinedCard', () => {
  const svg = renderCombinedCard('octo', usage, outcome, light, now);

  it('stacks the usage summary, heatmap, and outcome strip', () => {
    expect(svg).toContain('This month:');
    expect(svg.match(/class="hm"/g)?.length).toBe(26 * 7);
    expect(svg).toContain('≥42');
    expect(svg).toContain('AI commits');
    expect(svg).toContain('≥17');
    expect(svg).toContain('merged PRs');
    expect(svg).toContain('releases');
  });

  it('uses the outcome-first title wording', () => {
    expect(svg).toContain('shipped with AI');
  });

  it('has the fixed combined height', () => {
    expect(svg).toContain(`height="${COMBINED_CARD_HEIGHT}"`);
  });

  it('never contains emails, costs, or source labels', () => {
    expect(svg).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(svg).not.toMatch(/\$|cost|source/i);
  });
});

import { describe, expect, it } from 'vitest';
import { renderUsageCard } from '../src/render/usage-card.js';
import { resolveTheme } from '../src/render/themes.js';
import type { UsageData } from '../src/usage/types.js';

const now = new Date('2026-07-24T12:00:00Z');
const light = resolveTheme('light');

const data: UsageData = {
  days: new Map([
    ['2026-07-22', { tokens: 200_000, sessions: 3 }],
    ['2026-07-23', { tokens: 800_000, sessions: 5 }],
    ['2026-07-24', { tokens: 150_000, sessions: 2 }],
  ]),
  providers: [
    { provider: 'claude-code', tokens: 900_000 },
    { provider: 'codex', tokens: 250_000 },
  ],
  topModel: 'opus',
};

describe('renderUsageCard', () => {
  const svg = renderUsageCard('octo', data, light, now);

  it('renders the monthly summary with sessions, tokens, and streak', () => {
    expect(svg).toContain('This month: 10 sessions · 1.2M tokens · 3-day streak');
  });

  it('renders a 26-week heatmap grid', () => {
    expect(svg.match(/rx="2" fill="#0969da"/g)?.length).toBeGreaterThanOrEqual(26 * 7);
  });

  it('shows the tool share bar with friendly labels', () => {
    expect(svg).toContain('Claude Code 78%');
    expect(svg).toContain('Codex 22%');
  });

  it('shows the top model', () => {
    expect(svg).toContain('top model: opus');
  });

  it('omits sessions and streak lines when unavailable', () => {
    const sparse: UsageData = {
      days: new Map([['2026-07-01', { tokens: 5000, sessions: 0 }]]),
      providers: [{ provider: 'claude-code', tokens: 5000 }],
      topModel: null,
    };
    const out = renderUsageCard('octo', sparse, light, now);
    expect(out).toContain('This month: 5k tokens');
    expect(out).not.toContain('sessions');
    expect(out).not.toContain('streak');
    expect(out).not.toContain('top model:');
  });

  it('never renders costs, dollar signs, or source labels', () => {
    expect(svg).not.toMatch(/\$|cost|macbook|source/i);
  });

  it('never contains an email address', () => {
    expect(svg).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('escapes hostile provider and model strings', () => {
    const evil: UsageData = {
      days: new Map(),
      providers: [{ provider: '<script>x</script>', tokens: 100 }],
      topModel: '"><img onerror=1>',
    };
    const out = renderUsageCard('octo', evil, light, now);
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
  });
});

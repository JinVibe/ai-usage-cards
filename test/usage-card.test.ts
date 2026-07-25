import { describe, expect, it } from 'vitest';
import { renderUsageCard } from '../src/render/usage-card.js';
import { resolveTheme } from '../src/render/themes.js';
import type { UsageData } from '../src/usage/types.js';

const now = new Date('2026-07-24T12:00:00Z');
const light = resolveTheme('light');

const data: UsageData = {
  days: new Map([
    ['2026-05-10', { tokens: 400_000, sessions: 2 }],
    ['2026-07-22', { tokens: 200_000, sessions: 3 }],
    ['2026-07-23', { tokens: 800_000, sessions: 5 }],
    ['2026-07-24', { tokens: 150_000, sessions: 2 }],
  ]),
  providers: [
    { provider: 'claude-code', tokens: 1_300_000 },
    { provider: 'codex', tokens: 250_000 },
  ],
  topModel: 'opus',
};

describe('renderUsageCard', () => {
  const svg = renderUsageCard('octo', data, light, now);

  it('leads with the all-time total and the current month', () => {
    expect(svg).toContain('Total: 1.6M tokens · This month: 1.2M · 3-day streak');
  });

  it('shows the detail line with average, best day, and active days', () => {
    expect(svg).toContain('avg 388k/day · best day 800k · 4 active days');
  });

  it('renders a 26-week heatmap grid', () => {
    expect(svg.match(/class="hm"/g)?.length).toBe(26 * 7);
  });

  it('renders peak days in the gradient end color with a glow', () => {
    expect(svg).toContain(`fill="#8250df" filter="url(#cellglow)"`);
  });

  it('breaks usage down by month with labels and values', () => {
    for (const label of ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']) {
      expect(svg).toContain(`>${label}</text>`);
    }
    expect(svg).toContain('>400k</text>'); // May
    expect(svg).toContain('>1.2M</text>'); // July
  });

  it('shows the top model', () => {
    expect(svg).toContain('top model: opus');
  });

  it('omits the streak when there is no recent activity', () => {
    const sparse: UsageData = {
      days: new Map([['2026-07-01', { tokens: 5000, sessions: 0 }]]),
      providers: [{ provider: 'claude-code', tokens: 5000 }],
      topModel: null,
    };
    const out = renderUsageCard('octo', sparse, light, now);
    expect(out).toContain('Total: 5k tokens · This month: 5k');
    expect(out).not.toContain('streak');
    expect(out).not.toContain('top model:');
  });

  it('never renders costs, dollar signs, or source labels', () => {
    expect(svg).not.toMatch(/\$|cost|macbook|source/i);
  });

  it('never contains an email address', () => {
    expect(svg).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('escapes hostile model strings', () => {
    const evil: UsageData = {
      days: new Map([['2026-07-24', { tokens: 100, sessions: 1 }]]),
      providers: [],
      topModel: '"><img onerror=1>',
    };
    const out = renderUsageCard('octo', evil, light, now);
    expect(out).not.toContain('<img');
  });
});

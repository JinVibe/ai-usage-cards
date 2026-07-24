import { describe, expect, it } from 'vitest';
import { BUDDY_CARD_HEIGHT, buddyLevel, renderBuddyCard } from '../src/render/buddy-card.js';
import { resolveTheme } from '../src/render/themes.js';
import type { UsageData } from '../src/usage/types.js';

const light = resolveTheme('light');

function usageWithTotal(tokens: number): UsageData {
  return {
    days: new Map([['2026-07-24', { tokens, sessions: 1 }]]),
    providers: [{ provider: 'claude-code', tokens }],
    topModel: 'opus',
  };
}

describe('buddyLevel', () => {
  it('maps token totals to the five evolution stages', () => {
    expect(buddyLevel(0)).toMatchObject({ level: 1, name: 'Spark', next: 1_000_000 });
    expect(buddyLevel(999_999).level).toBe(1);
    expect(buddyLevel(1_000_000)).toMatchObject({ level: 2, name: 'Ember' });
    expect(buddyLevel(10_000_000)).toMatchObject({ level: 3, name: 'Circuit' });
    expect(buddyLevel(50_000_000)).toMatchObject({ level: 4, name: 'Dynamo' });
    expect(buddyLevel(250_000_000)).toMatchObject({ level: 5, name: 'Nova', next: null });
  });
});

describe('renderBuddyCard', () => {
  it('shows the level, name, total, and progress hint', () => {
    const svg = renderBuddyCard('octo', usageWithTotal(13_600_000), light);
    expect(svg).toContain('Lv.3 · Circuit');
    expect(svg).toContain('13.6M tokens');
    expect(svg).toContain('36.4M to Lv.4');
    expect(svg).toContain(`height="${BUDDY_CARD_HEIGHT}"`);
  });

  it('caps at max level', () => {
    const svg = renderBuddyCard('octo', usageWithTotal(500_000_000), light);
    expect(svg).toContain('Lv.5 · Nova');
    expect(svg).toContain('max level');
  });

  it('renders distinct art per level', () => {
    const arts = [0, 2_000_000, 20_000_000, 60_000_000, 300_000_000].map(
      (t) => renderBuddyCard('octo', usageWithTotal(t), light),
    );
    expect(new Set(arts).size).toBe(5);
  });

  it('never contains emails, costs, or vendor names', () => {
    const svg = renderBuddyCard('octo', usageWithTotal(1_000), light);
    expect(svg).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(svg).not.toMatch(/\$|cost|anthropic|openai|claude|gpt/i);
  });
});

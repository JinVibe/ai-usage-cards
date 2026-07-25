import { describe, expect, it } from 'vitest';
import type { CardData } from '../src/core/types.js';
import type { UsageData } from '../src/usage/types.js';
import { renderCard } from '../src/render/card.js';
import { renderBuddyCard } from '../src/render/buddy-card.js';
import { renderCombinedCard } from '../src/render/combined-card.js';
import { renderEmptyCard, renderErrorCard } from '../src/render/error-card.js';
import { renderUsageCard } from '../src/render/usage-card.js';
import { resolveTheme, themes } from '../src/render/themes.js';

const now = new Date('2026-07-24T12:00:00Z');

const outcome: CardData = {
  username: 'octo',
  commits: 12,
  mergedPrs: 4,
  releases: 1,
  repoCount: 2,
  repoCases: [{ repo: 'octo/app', commits: 8, latestReleaseTag: 'v1.0.0' }],
  agentCounts: [{ id: 'claude', commits: 12 }],
  truncated: false,
};

const usage: UsageData = {
  days: new Map([['2026-07-24', { tokens: 60_000_000, sessions: 3 }]]),
  providers: [{ provider: 'claude-code', tokens: 60_000_000 }],
  topModel: 'opus',
};

/**
 * A CSS `transform` animation REPLACES an element's `transform` attribute, so
 * any element combining class="fade" with a transform attribute renders at
 * the origin instead of its intended position (the buddy once appeared
 * clipped in the top-left corner because of this). Guard every renderer.
 */
describe('animated elements never carry an SVG transform attribute', () => {
  const cards: Record<string, string[]> = {};
  for (const name of Object.keys(themes)) {
    const theme = resolveTheme(name);
    cards[name] = [
      renderCard(outcome, theme, ['funnel', 'repos']),
      renderUsageCard('octo', usage, theme, now),
      renderBuddyCard('octo', usage, theme),
      renderCombinedCard('octo', usage, outcome, theme, now),
      renderEmptyCard('octo', theme),
      renderErrorCard('rate-limited', theme),
    ];
  }

  it('holds for every card in every theme', () => {
    for (const svgs of Object.values(cards)) {
      for (const svg of svgs) {
        expect(svg).not.toMatch(/class="fade"[^>]*transform=/);
        expect(svg).not.toMatch(/<[a-z]+ [^>]*transform="[^"]*"[^>]*class="fade"/);
      }
    }
  });
});

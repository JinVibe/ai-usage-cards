import { describe, expect, it } from 'vitest';
import { renderEmptyCard, renderErrorCard, type CardErrorKind } from '../src/render/error-card.js';
import { resolveTheme } from '../src/render/themes.js';

const light = resolveTheme('light');

describe('renderEmptyCard', () => {
  it('reads as an invitation, not an error', () => {
    const svg = renderEmptyCard('octo', light);
    expect(svg).toContain('octo');
    expect(svg).toContain('yet');
    expect(svg.toLowerCase()).not.toContain('error');
  });

  it('mentions the honest coverage limits', () => {
    expect(renderEmptyCard('octo', light)).toContain('squash merges');
  });

  it('escapes hostile usernames', () => {
    const svg = renderEmptyCard('<img onerror=x>', light);
    expect(svg).not.toContain('<img onerror');
  });
});

describe('renderErrorCard', () => {
  const kinds: CardErrorKind[] = ['invalid-username', 'user-not-found', 'rate-limited', 'upstream'];

  it('always returns well-formed SVG for every error kind', () => {
    for (const kind of kinds) {
      const svg = renderErrorCard(kind, light);
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    }
  });

  it('gives each error kind a distinct message', () => {
    const messages = kinds.map((kind) => renderErrorCard(kind, light));
    expect(new Set(messages).size).toBe(kinds.length);
  });
});

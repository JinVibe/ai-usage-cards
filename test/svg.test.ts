import { describe, expect, it } from 'vitest';
import { approxTextWidth, escapeXml, truncateToWidth } from '../src/render/svg.js';
import { DEFAULT_THEME, resolveTheme, themes } from '../src/render/themes.js';

describe('escapeXml', () => {
  it('escapes all XML-special characters', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;',
    );
  });
});

describe('approxTextWidth', () => {
  it('is monotonic in text length', () => {
    expect(approxTextWidth('ab', 12)).toBeGreaterThan(approxTextWidth('a', 12));
  });

  it('scales with font size', () => {
    expect(approxTextWidth('abc', 24)).toBeCloseTo(approxTextWidth('abc', 12) * 2);
  });

  it('counts wide characters as wider than narrow ones', () => {
    expect(approxTextWidth('mmm', 12)).toBeGreaterThan(approxTextWidth('iii', 12));
  });
});

describe('truncateToWidth', () => {
  it('returns short text unchanged', () => {
    expect(truncateToWidth('short', 500, 12)).toBe('short');
  });

  it('truncates long text with an ellipsis within the budget', () => {
    const out = truncateToWidth('a-very-long-repository-name/with-a-long-suffix', 100, 12);
    expect(out.endsWith('…')).toBe(true);
    expect(approxTextWidth(out, 12)).toBeLessThanOrEqual(100);
  });
});

describe('resolveTheme', () => {
  it('falls back to the default for unknown or missing names', () => {
    expect(resolveTheme(undefined)).toBe(themes[DEFAULT_THEME]);
    expect(resolveTheme('neon-rainbow')).toBe(themes[DEFAULT_THEME]);
  });

  it('resolves every registered theme', () => {
    for (const name of Object.keys(themes)) {
      expect(resolveTheme(name)).toBe(themes[name]);
    }
  });

  it('keeps themes single-hue: accent matches title', () => {
    for (const theme of Object.values(themes)) {
      expect(theme.accent).toBe(theme.title);
    }
  });
});

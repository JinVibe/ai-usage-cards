import { describe, expect, it } from 'vitest';
import type { CardData } from '../src/core/types.js';
import { renderCard } from '../src/render/card.js';
import { resolveTheme } from '../src/render/themes.js';

const data: CardData = {
  username: 'octo',
  commits: 42,
  mergedPrs: 17,
  releases: 3,
  repoCount: 4,
  repoCases: [
    { repo: 'octo/app', commits: 20, latestReleaseTag: 'v1.2.0' },
    { repo: 'octo/lib', commits: 9, latestReleaseTag: null },
  ],
  agentCounts: [
    { id: 'claude', commits: 30 },
    { id: 'copilot', commits: 12 },
  ],
  truncated: false,
};

const light = resolveTheme('light');

describe('renderCard', () => {
  it('renders the funnel with at-least framing', () => {
    const svg = renderCard(data, light, ['funnel']);
    expect(svg).toContain('≥42');
    expect(svg).toContain('≥17');
    expect(svg).toContain('AI-assisted commits');
    expect(svg).toContain('merged PRs');
    expect(svg).toContain('releases');
  });

  it('uses outcome-first wording, never "AI wrote"', () => {
    const svg = renderCard(data, light, ['funnel', 'repos']);
    expect(svg).toContain('shipped with AI');
    expect(svg.toLowerCase()).not.toContain('ai wrote');
  });

  it('names the directed agents with friendly labels and counts', () => {
    const svg = renderCard(data, light, ['funnel']);
    expect(svg).toContain('Claude</tspan>');
    expect(svg).toContain('×30');
    expect(svg).toContain('GitHub Copilot</tspan>');
    expect(svg).toContain('×12');
  });

  it('omits the agents line when there are none', () => {
    const svg = renderCard({ ...data, agentCounts: [] }, light, ['funnel']);
    expect(svg).not.toContain('with <tspan');
  });

  it('renders repo case rows only when the repos module is requested', () => {
    const withRepos = renderCard(data, light, ['funnel', 'repos']);
    expect(withRepos).toContain('app');
    expect(withRepos).toContain('shipped v1.2.0');

    const funnelOnly = renderCard(data, light, ['funnel']);
    expect(funnelOnly).not.toContain('shipped v1.2.0');
  });

  it('grows the card height with the repos module', () => {
    const heightOf = (svg: string) => Number(/height="(\d+)"/.exec(svg)?.[1]);
    expect(heightOf(renderCard(data, light, ['funnel', 'repos']))).toBeGreaterThan(
      heightOf(renderCard(data, light, ['funnel'])),
    );
  });

  it('ignores unknown module names silently', () => {
    const svg = renderCard(data, light, ['funnel', 'sparkles']);
    expect(svg).toContain('≥42');
  });

  it('includes the footer attribution link', () => {
    const svg = renderCard(data, light, ['funnel']);
    expect(svg).toContain('made with ai-usage-cards');
    expect(svg).toContain('https://github.com/JinVibe/ai-usage-cards');
  });

  it('escapes injection attempts in usernames', () => {
    const evil = { ...data, username: '"><script>alert(1)</script>' };
    const svg = renderCard(evil, light, ['funnel']);
    expect(svg).not.toContain('<script>');
  });

  it('never contains an email address in the output', () => {
    for (const modules of [['funnel'], ['funnel', 'repos']]) {
      const svg = renderCard(data, light, modules);
      expect(svg).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
  });

  it('never mentions token counts or cost', () => {
    const svg = renderCard(data, light, ['funnel', 'repos']);
    expect(svg.toLowerCase()).not.toMatch(/token|cost|\$/);
  });
});

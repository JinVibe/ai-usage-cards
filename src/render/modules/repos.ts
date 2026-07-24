import type { CardData, RepoCase } from '../../core/types.js';
import { CARD_PADDING, CARD_WIDTH, CONTENT_WIDTH } from '../layout.js';
import { approxTextWidth, escapeXml, truncateToWidth } from '../svg.js';
import type { Theme } from '../themes.js';

export const REPO_ROW_HEIGHT = 26;
const FONT_SIZE = 11;
const BAR_WIDTH = 64;
const BAR_HEIGHT = 4;
/** Text must stop before the commit-share bar on the right. */
const TEXT_BUDGET = CONTENT_WIDTH - BAR_WIDTH - 16;

export function reposHeight(data: CardData): number {
  return data.repoCases.length * REPO_ROW_HEIGHT + (data.repoCases.length > 0 ? 8 : 0);
}

function caseSuffix(repoCase: RepoCase): string {
  const commits = `≥${repoCase.commits} AI-assisted commit${repoCase.commits === 1 ? '' : 's'}`;
  return repoCase.latestReleaseTag
    ? ` — shipped ${repoCase.latestReleaseTag} · ${commits}`
    : ` · ${commits}`;
}

/**
 * Opt-in per-repo case cards: `repo — shipped v1.0 · ≥N AI-assisted commits`,
 * each with a thin single-hue bar showing its share of the user's AI commits.
 */
export function renderRepos(data: CardData, theme: Theme, y: number): string {
  const maxCommits = Math.max(1, ...data.repoCases.map((r) => r.commits));
  return data.repoCases
    .map((repoCase, i) => {
      const rowY = y + 18 + REPO_ROW_HEIGHT * i;
      const name = repoCase.repo.split('/')[1] ?? repoCase.repo;
      const suffix = caseSuffix(repoCase);
      const nameBudget = TEXT_BUDGET - 12 - approxTextWidth(suffix, FONT_SIZE);
      const shownName = truncateToWidth(name, Math.max(nameBudget, 60), FONT_SIZE);
      const barX = CARD_WIDTH - CARD_PADDING - BAR_WIDTH;
      const barY = rowY - BAR_HEIGHT - 1;
      const fillWidth = Math.max(BAR_HEIGHT, Math.round((repoCase.commits / maxCommits) * BAR_WIDTH));
      return `
    <g class="fade" style="animation-delay:${450 + i * 100}ms">
      <circle cx="${CARD_PADDING + 3}" cy="${rowY - 3.5}" r="2.5" fill="${theme.accent}"/>
      <text x="${CARD_PADDING + 12}" y="${rowY}" font-size="${FONT_SIZE}" fill="${theme.muted}"><tspan fill="${theme.accent}" font-weight="600">${escapeXml(shownName)}</tspan><tspan fill="${theme.text}">${escapeXml(suffix)}</tspan></text>
      <rect x="${barX}" y="${barY}" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="2" fill="${theme.accent}" fill-opacity="0.12"/>
      <rect x="${barX}" y="${barY}" width="${fillWidth}" height="${BAR_HEIGHT}" rx="2" fill="${theme.accent}" fill-opacity="0.55"/>
    </g>`;
    })
    .join('');
}

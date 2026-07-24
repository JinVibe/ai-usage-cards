import type { CardData, RepoCase } from '../../core/types.js';
import { CARD_PADDING, CONTENT_WIDTH } from '../layout.js';
import { approxTextWidth, escapeXml, truncateToWidth } from '../svg.js';
import type { Theme } from '../themes.js';

export const REPO_ROW_HEIGHT = 26;
const FONT_SIZE = 11;

export function reposHeight(data: CardData): number {
  return data.repoCases.length * REPO_ROW_HEIGHT + (data.repoCases.length > 0 ? 6 : 0);
}

function caseSuffix(repoCase: RepoCase): string {
  const commits = `≥${repoCase.commits} AI-assisted commit${repoCase.commits === 1 ? '' : 's'}`;
  return repoCase.latestReleaseTag
    ? ` — shipped ${repoCase.latestReleaseTag} · ${commits}`
    : ` · ${commits}`;
}

/**
 * Opt-in per-repo case cards: `repo — shipped v1.0 · ≥N AI-assisted commits`.
 * A unit users can paste next to a resume line.
 */
export function renderRepos(data: CardData, theme: Theme, y: number): string {
  return data.repoCases
    .map((repoCase, i) => {
      const rowY = y + 16 + REPO_ROW_HEIGHT * i;
      const name = repoCase.repo.split('/')[1] ?? repoCase.repo;
      const suffix = caseSuffix(repoCase);
      const nameBudget = CONTENT_WIDTH - 14 - approxTextWidth(suffix, FONT_SIZE);
      const shownName = truncateToWidth(name, Math.max(nameBudget, 60), FONT_SIZE);
      return `
    <text x="${CARD_PADDING}" y="${rowY}" font-size="${FONT_SIZE}" fill="${theme.muted}">▸ <tspan fill="${theme.accent}" font-weight="600">${escapeXml(shownName)}</tspan><tspan fill="${theme.text}">${escapeXml(suffix)}</tspan></text>`;
    })
    .join('');
}

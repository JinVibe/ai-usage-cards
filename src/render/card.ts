import type { CardData } from '../core/types.js';
import {
  CARD_PADDING,
  CARD_WIDTH,
  FONT_FAMILY,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
} from './layout.js';
import { FUNNEL_HEIGHT, renderFunnel } from './modules/funnel.js';
import { renderRepos, reposHeight } from './modules/repos.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

export const PROJECT_URL = 'https://github.com/JinVibe/ai-usage-cards';

export interface CardModule {
  height(data: CardData): number;
  render(data: CardData, theme: Theme, y: number): string;
}

/** Module registry: `modules` query values map to these keys. All opt-in. */
export const cardModules: Record<string, CardModule> = {
  funnel: {
    height: () => FUNNEL_HEIGHT,
    render: renderFunnel,
  },
  repos: {
    height: reposHeight,
    render: renderRepos,
  },
};

export function cardShell(theme: Theme, height: number, body: string, ariaLabel: string): string {
  const footerY = height - 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}" font-family="${FONT_FAMILY}">
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>${body}
  <a href="${PROJECT_URL}" target="_blank">
    <text x="${CARD_WIDTH - CARD_PADDING}" y="${footerY}" text-anchor="end" font-size="9" fill="${theme.muted}">made with ai-usage-cards</text>
  </a>
</svg>`;
}

/**
 * Renders the full stats card: header, the requested modules in order, footer.
 * Wording rules (design doc): "directed AI to ship" — outcomes, not volume.
 * By construction nothing here receives an email address.
 */
export function renderCard(data: CardData, theme: Theme, moduleNames: string[]): string {
  const active = moduleNames
    .map((name) => cardModules[name])
    .filter((m): m is CardModule => m !== undefined);

  let height = HEADER_HEIGHT + FOOTER_HEIGHT;
  for (const mod of active) height += mod.height(data);

  const title = truncateToWidth(`${data.username} · directed AI to ship`, CARD_WIDTH - CARD_PADDING * 2, 14);
  let body = `
  <text x="${CARD_PADDING}" y="33" font-size="14" font-weight="600" fill="${theme.title}">${escapeXml(title)}</text>`;

  let y = HEADER_HEIGHT;
  for (const mod of active) {
    body += mod.render(data, theme, y);
    y += mod.height(data);
  }

  return cardShell(
    theme,
    height,
    body,
    `${data.username}: at least ${data.commits} AI-assisted commits, at least ${data.mergedPrs} merged PRs, ${data.releases} releases`,
  );
}

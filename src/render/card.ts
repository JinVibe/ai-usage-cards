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
import { approxTextWidth, escapeXml, truncateToWidth } from './svg.js';
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

/** Four-point sparkle, drawn at the header's left edge in the accent hue. */
function sparkle(theme: Theme): string {
  return `
  <g class="fade" transform="translate(${CARD_PADDING}, 21)">
    <path d="M7 0 L8.6 5.4 L14 7 L8.6 8.6 L7 14 L5.4 8.6 L0 7 L5.4 5.4 Z" fill="${theme.accent}"/>
  </g>`;
}

/**
 * Shared SVG wrapper: background, border, footer link, and the fade-up
 * animation (disabled under prefers-reduced-motion). GitHub's camo proxy
 * serves SVGs as <img>, where CSS animations still run.
 */
export function cardShell(theme: Theme, height: number, body: string, ariaLabel: string): string {
  const footerY = height - 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}" font-family="${FONT_FAMILY}">
  <style>
    .fade { opacity: 0; animation: fadeUp 0.5s ease-out forwards; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .fade { opacity: 1; animation: none; } }
  </style>
  <rect x="0.5" y="0.5" width="${CARD_WIDTH - 1}" height="${height - 1}" rx="8" fill="${theme.bg}" stroke="${theme.border}"/>${body}
  <a href="${PROJECT_URL}" target="_blank">
    <text x="${CARD_WIDTH - CARD_PADDING}" y="${footerY}" text-anchor="end" font-size="9" fill="${theme.muted}" fill-opacity="0.8">made with ai-usage-cards</text>
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

  const repoNote =
    data.repoCount > 0
      ? `in ${data.repoCount} public repo${data.repoCount === 1 ? '' : 's'}`
      : '';
  const noteWidth = repoNote ? approxTextWidth(repoNote, 10) + 12 : 0;
  const titleX = CARD_PADDING + 22;
  const title = truncateToWidth(
    `${data.username} · directed AI to ship`,
    CARD_WIDTH - titleX - CARD_PADDING - noteWidth,
    14,
  );

  let body = sparkle(theme) + `
  <text class="fade" x="${titleX}" y="33" font-size="14" font-weight="600" fill="${theme.title}">${escapeXml(title)}</text>`;
  if (repoNote) {
    body += `
  <text class="fade" style="animation-delay:100ms" x="${CARD_WIDTH - CARD_PADDING}" y="33" text-anchor="end" font-size="10" fill="${theme.muted}">${escapeXml(repoNote)}</text>`;
  }

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

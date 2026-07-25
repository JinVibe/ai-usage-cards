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
export function cardShell(
  theme: Theme,
  height: number,
  body: string,
  ariaLabel: string,
  width: number = CARD_WIDTH,
): string {
  const footerY = height - 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(ariaLabel)}" font-family="${FONT_FAMILY}">
  <defs>
    <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent2}"/>
    </linearGradient>
    <radialGradient id="glowg">
      <stop offset="0" stop-color="${theme.accent2}" stop-opacity="0.14"/><stop offset="1" stop-color="${theme.accent2}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="${theme.accent}" flood-opacity="0.22"/>
    </filter>
    <filter id="cellglow" x="-150%" y="-150%" width="400%" height="400%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.6" flood-color="${theme.accent2}" flood-opacity="0.9"/>
    </filter>
    <clipPath id="clip"><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8"/></clipPath>
  </defs>
  <style>
    .fade { opacity: 0; animation: fadeUp 0.5s ease-out forwards; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .beam { animation: beam 7s linear infinite; }
    @keyframes beam { to { stroke-dashoffset: -100; } }
    @media (prefers-reduced-motion: reduce) { .fade { opacity: 1; animation: none; } .beam { animation: none; opacity: 0.3; } }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${theme.bg}" stroke="${theme.border}"/>
  <g clip-path="url(#clip)">
    <circle cx="${width - 36}" cy="4" r="96" fill="url(#glowg)"/>
    <circle cx="10" cy="${height}" r="70" fill="url(#glowg)"/>
  </g>
  <rect class="beam" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="none" stroke="url(#ag)" stroke-width="1" pathLength="100" stroke-dasharray="26 74" stroke-linecap="round" opacity="0.75"/>${body}
  <a href="${PROJECT_URL}" target="_blank">
    <text x="${width - CARD_PADDING}" y="${footerY}" text-anchor="end" font-size="9" fill="${theme.muted}" fill-opacity="0.8">made with ai-usage-cards</text>
  </a>
</svg>`;
}

/**
 * Renders the full stats card: header, the requested modules in order, footer.
 * Wording rules (design doc): outcomes, not volume — "shipped with AI",
 * never "AI wrote my code". By construction nothing here receives an email.
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
    `${data.username} · shipped with AI`,
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

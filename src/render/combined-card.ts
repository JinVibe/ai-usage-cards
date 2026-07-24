import type { CardData } from '../core/types.js';
import type { UsageData } from '../usage/types.js';
import { formatTokens, monthTotals } from '../usage/stats.js';
import { cardShell } from './card.js';
import { CARD_PADDING, CARD_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT } from './layout.js';
import { GRID_HEIGHT, GRID_WIDTH, renderHeatmap, summaryLine } from './usage-card.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

const SUMMARY_HEIGHT = 26;
const HEATMAP_BLOCK = GRID_HEIGHT + 12;
const STRIP_BLOCK = 40;

export const COMBINED_CARD_HEIGHT =
  HEADER_HEIGHT + SUMMARY_HEIGHT + HEATMAP_BLOCK + STRIP_BLOCK + FOOTER_HEIGHT;

/** The one-line outcome strip: `≥N AI commits → ≥M merged PRs → K releases`. */
function outcomeStrip(outcome: CardData, theme: Theme, y: number): string {
  const stats = [
    { value: `≥${outcome.commits}`, label: 'AI commits' },
    { value: `≥${outcome.mergedPrs}`, label: 'merged PRs' },
    { value: String(outcome.releases), label: outcome.releases === 1 ? 'release' : 'releases' },
  ];
  const spans = stats
    .map(
      (s) =>
        `<tspan font-weight="700" fill="${theme.text}">${escapeXml(s.value)}</tspan><tspan fill="${theme.muted}" font-size="10"> ${escapeXml(s.label)}</tspan>`,
    )
    .join(`<tspan fill="${theme.muted}">  →  </tspan>`);
  return `
  <line class="fade" style="animation-delay:400ms" x1="${CARD_PADDING}" y1="${y}" x2="${CARD_WIDTH - CARD_PADDING}" y2="${y}" stroke="${theme.border}"/>
  <text class="fade" style="animation-delay:480ms" x="${CARD_WIDTH / 2}" y="${y + 26}" text-anchor="middle" font-size="13">${spans}</text>`;
}

/**
 * The "effort → outcome" card: the usage heatmap (what you put in) stacked
 * with the shipping funnel (what came out) — the one-glance story neither
 * card tells alone. Same privacy rules as both parents.
 */
export function renderCombinedCard(
  username: string,
  usage: UsageData,
  outcome: CardData,
  theme: Theme,
  now: Date,
): string {
  const title = truncateToWidth(
    `${username} · directed AI to ship`,
    CARD_WIDTH - CARD_PADDING * 2 - 120,
    14,
  );
  const gridX = CARD_PADDING + Math.floor((CARD_WIDTH - CARD_PADDING * 2 - GRID_WIDTH) / 2);
  const summaryY = HEADER_HEIGHT + 14;
  const gridY = HEADER_HEIGHT + SUMMARY_HEIGHT + 4;
  const stripY = gridY + GRID_HEIGHT + 12;

  const body = `
  <g class="fade" transform="translate(${CARD_PADDING}, 21)">
    <path d="M7 0 L8.6 5.4 L14 7 L8.6 8.6 L7 14 L5.4 8.6 L0 7 L5.4 5.4 Z" fill="${theme.accent}"/>
  </g>
  <text class="fade" x="${CARD_PADDING + 22}" y="33" font-size="14" font-weight="600" fill="${theme.title}">${escapeXml(title)}</text>
  <text class="fade" style="animation-delay:100ms" x="${CARD_WIDTH - CARD_PADDING}" y="33" text-anchor="end" font-size="10" fill="${theme.muted}">last 6 months</text>
  <text class="fade" style="animation-delay:150ms" x="${CARD_PADDING}" y="${summaryY}" font-size="12" fill="${theme.text}">${escapeXml(summaryLine(usage, now))}</text>` +
    renderHeatmap(usage, theme, gridX, gridY, now) +
    outcomeStrip(outcome, theme, stripY);

  const month = monthTotals(usage, now);
  return cardShell(
    theme,
    COMBINED_CARD_HEIGHT,
    body,
    `${username}: ${formatTokens(month.tokens)} AI tokens this month; at least ${outcome.commits} AI-assisted commits, at least ${outcome.mergedPrs} merged PRs, ${outcome.releases} releases`,
  );
}

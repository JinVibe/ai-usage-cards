import type { UsageData } from '../usage/types.js';
import { currentStreak, formatTokens, heatmapGrid, monthTotals } from '../usage/stats.js';
import { cardShell } from './card.js';
import { CARD_PADDING, CARD_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT } from './layout.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

const WEEKS = 26;
const CELL = 10;
const CELL_GAP = 2;
export const GRID_WIDTH = WEEKS * (CELL + CELL_GAP) - CELL_GAP; // 310
export const GRID_HEIGHT = 7 * (CELL + CELL_GAP) - CELL_GAP; // 82

const SUMMARY_HEIGHT = 26;
const HEATMAP_BLOCK = GRID_HEIGHT + 14;
const RATIO_BLOCK = 30;

export const USAGE_CARD_HEIGHT =
  HEADER_HEIGHT + SUMMARY_HEIGHT + HEATMAP_BLOCK + RATIO_BLOCK + FOOTER_HEIGHT;

/** Single-hue intensity ramp — the heatmap is the centerpiece, no rainbows. */
const LEVEL_OPACITY = [0, 0.22, 0.45, 0.7, 1];
const IDLE_OPACITY = 0.07;

const PROVIDER_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  'gemini-cli': 'Gemini CLI',
  'copilot-cli': 'Copilot CLI',
  opencode: 'OpenCode',
  amp: 'Amp',
};

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function summaryLine(data: UsageData, now: Date): string {
  const month = monthTotals(data, now);
  const streak = currentStreak(data, now);
  const parts: string[] = [];
  if (month.sessions > 0) parts.push(`${month.sessions} sessions`);
  parts.push(`${formatTokens(month.tokens)} tokens`);
  if (streak > 0) parts.push(`${streak}-day streak`);
  return `This month: ${parts.join(' · ')}`;
}

export function renderHeatmap(data: UsageData, theme: Theme, x: number, y: number, now: Date): string {
  const grid = heatmapGrid(data, now, WEEKS);
  const cells: string[] = [];
  grid.forEach((column, w) => {
    column.forEach((cell, d) => {
      const opacity = cell.level === 0 ? IDLE_OPACITY : LEVEL_OPACITY[cell.level];
      cells.push(
        `<rect x="${x + w * (CELL + CELL_GAP)}" y="${y + d * (CELL + CELL_GAP)}" width="${CELL}" height="${CELL}" rx="2" fill="${theme.accent}" fill-opacity="${opacity}"/>`,
      );
    });
  });
  return `
  <g class="fade" style="animation-delay:250ms">${cells.join('')}</g>`;
}

/** One thin single-hue ratio bar with small labels — per design doc §6. */
function renderProviderBar(data: UsageData, theme: Theme, y: number): string {
  if (data.providers.length === 0) return '';
  const total = data.providers.reduce((sum, p) => sum + p.tokens, 0);
  const shown = data.providers.slice(0, 4);
  const barWidth = CARD_WIDTH - CARD_PADDING * 2;
  const opacities = [0.9, 0.55, 0.32, 0.18];

  let x = CARD_PADDING;
  const segments = shown.map((p, i) => {
    const w = Math.max(3, (p.tokens / total) * barWidth);
    const seg = `<rect x="${x.toFixed(1)}" y="${y}" width="${Math.min(w, CARD_PADDING + barWidth - x).toFixed(1)}" height="5" rx="2.5" fill="${theme.accent}" fill-opacity="${opacities[i]}"/>`;
    x += w + 2;
    return seg;
  });

  const label = shown
    .map((p) => `${providerLabel(p.provider)} ${Math.round((p.tokens / total) * 100)}%`)
    .join(' · ');
  return `
  <g class="fade" style="animation-delay:400ms">
    ${segments.join('')}
    <text x="${CARD_PADDING}" y="${y + 19}" font-size="9" fill="${theme.muted}">${escapeXml(truncateToWidth(label, barWidth - 4, 9))}</text>
  </g>`;
}

/**
 * The Layer 2 card: usage heatmap, monthly summary, tool-share bar.
 * Renders aggregates only — never source labels, costs, or anything from
 * local logs beyond the numeric summaries in the gist.
 */
export function renderUsageCard(
  username: string,
  data: UsageData,
  theme: Theme,
  now: Date,
): string {
  const title = truncateToWidth(`${username} · AI at work`, CARD_WIDTH - CARD_PADDING * 2 - 130, 14);
  const gridX = CARD_PADDING + Math.floor((CARD_WIDTH - CARD_PADDING * 2 - GRID_WIDTH) / 2);
  const summaryY = HEADER_HEIGHT + 14;
  const gridY = HEADER_HEIGHT + SUMMARY_HEIGHT + 6;
  const barY = gridY + GRID_HEIGHT + 14;

  let body = `
  <g class="fade" transform="translate(${CARD_PADDING}, 21)">
    <path d="M7 0 L8.6 5.4 L14 7 L8.6 8.6 L7 14 L5.4 8.6 L0 7 L5.4 5.4 Z" fill="${theme.accent}"/>
  </g>
  <text class="fade" x="${CARD_PADDING + 22}" y="33" font-size="14" font-weight="600" fill="${theme.title}">${escapeXml(title)}</text>`;

  if (data.topModel) {
    body += `
  <text class="fade" style="animation-delay:100ms" x="${CARD_WIDTH - CARD_PADDING}" y="33" text-anchor="end" font-size="10" fill="${theme.muted}">top model: ${escapeXml(truncateToWidth(data.topModel, 110, 10))}</text>`;
  }

  body += `
  <text class="fade" style="animation-delay:150ms" x="${CARD_PADDING}" y="${summaryY}" font-size="12" fill="${theme.text}">${escapeXml(summaryLine(data, now))}</text>`;
  body += renderHeatmap(data, theme, gridX, gridY, now);
  body += renderProviderBar(data, theme, barY);

  const month = monthTotals(data, now);
  return cardShell(
    theme,
    USAGE_CARD_HEIGHT,
    body,
    `${username}: ${formatTokens(month.tokens)} AI tokens this month across ${data.providers.length} tools`,
  );
}

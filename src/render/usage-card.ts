import type { UsageData } from '../usage/types.js';
import {
  currentStreak,
  formatTokens,
  heatmapGrid,
  monthTotals,
  monthlyTotals,
  totalTokens,
} from '../usage/stats.js';
import { cardShell } from './card.js';
import { CARD_PADDING, CARD_WIDTH, FOOTER_HEIGHT, HEADER_HEIGHT } from './layout.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

const WEEKS = 26;
const CELL = 10;
const CELL_GAP = 2;
export const GRID_WIDTH = WEEKS * (CELL + CELL_GAP) - CELL_GAP; // 310
export const GRID_HEIGHT = 7 * (CELL + CELL_GAP) - CELL_GAP; // 82

const SUMMARY_HEIGHT = 24;
const HEATMAP_BLOCK = GRID_HEIGHT + 10;
const MONTHS_BLOCK = 42;
const MONTHS_SHOWN = 6;

/** 244px — kept equal to the outcome card (funnel + repo slots). */
export const USAGE_CARD_HEIGHT =
  HEADER_HEIGHT + SUMMARY_HEIGHT + HEATMAP_BLOCK + MONTHS_BLOCK + FOOTER_HEIGHT;

/** Single-hue intensity ramp — the heatmap is the centerpiece, no rainbows. */
const LEVEL_OPACITY = [0, 0.22, 0.45, 0.7, 1];
const IDLE_OPACITY = 0.07;

/** `Total: 48M tokens · This month: 5.7M · 3-day streak` */
export function summaryLine(data: UsageData, now: Date): string {
  const parts = [
    `Total: ${formatTokens(totalTokens(data))} tokens`,
    `This month: ${formatTokens(monthTotals(data, now).tokens)}`,
  ];
  const streak = currentStreak(data, now);
  if (streak > 0) parts.push(`${streak}-day streak`);
  return parts.join(' · ');
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

/**
 * Month-by-month mini bars for the last six calendar months: value on top,
 * bar in the middle, month label below. The current month is emphasized.
 */
function renderMonthlyBars(data: UsageData, theme: Theme, y: number, now: Date): string {
  const months = monthlyTotals(data, now, MONTHS_SHOWN);
  const max = Math.max(1, ...months.map((m) => m.tokens));
  const colWidth = (CARD_WIDTH - CARD_PADDING * 2) / MONTHS_SHOWN;
  const barMaxHeight = 16;
  const barWidth = 30;
  const barBottom = y + 26;

  const bars = months.map((month, i) => {
    const cx = CARD_PADDING + colWidth * i + colWidth / 2;
    const h = month.tokens === 0 ? 0 : Math.max(2, Math.round((month.tokens / max) * barMaxHeight));
    const isCurrent = i === months.length - 1;
    return `
    <text x="${cx}" y="${y + 6}" text-anchor="middle" font-size="8" fill="${theme.muted}">${month.tokens > 0 ? formatTokens(month.tokens) : ''}</text>
    <rect x="${(cx - barWidth / 2).toFixed(1)}" y="${barBottom - h}" width="${barWidth}" height="${h}" rx="2" fill="${theme.accent}" fill-opacity="${isCurrent ? 0.85 : 0.4}"/>
    <text x="${cx}" y="${barBottom + 11}" text-anchor="middle" font-size="8" fill="${theme.muted}">${escapeXml(month.label)}</text>`;
  });

  return `
  <g class="fade" style="animation-delay:400ms">${bars.join('')}</g>`;
}

/**
 * The Layer 2 card: usage heatmap, all-time and monthly totals. Renders
 * aggregates only — never source labels, costs, or anything from local logs
 * beyond the numeric summaries in the gist. When the user passes a
 * `providers` filter, the data is already narrowed before it reaches here.
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
  const gridY = HEADER_HEIGHT + SUMMARY_HEIGHT + 4;
  const monthsY = gridY + GRID_HEIGHT + 12;

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
  body += renderMonthlyBars(data, theme, monthsY, now);

  return cardShell(
    theme,
    USAGE_CARD_HEIGHT,
    body,
    `${username}: ${formatTokens(totalTokens(data))} AI tokens total, ${formatTokens(monthTotals(data, now).tokens)} this month`,
  );
}

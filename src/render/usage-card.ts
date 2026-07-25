import type { UsageData } from '../usage/types.js';
import {
  currentStreak,
  formatTokens,
  heatmapGrid,
  monthTotals,
  monthlyTotals,
  totalTokens,
  usageDetails,
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

const SUMMARY_HEIGHT = 42;
const HEATMAP_BLOCK = GRID_HEIGHT + 10;
const MONTHS_BLOCK = 40;
const MONTHS_SHOWN = 6;

/** 260px — kept equal to the outcome card (funnel + agents + repo slots). */
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

/** `avg 388k/day · best day 800k · 41 active days` */
export function detailLine(data: UsageData): string {
  const details = usageDetails(data);
  if (details.activeDays === 0) return '';
  return [
    `avg ${formatTokens(details.avgPerActiveDay)}/day`,
    `best day ${formatTokens(details.bestDay)}`,
    `${details.activeDays} active day${details.activeDays === 1 ? '' : 's'}`,
  ].join(' · ');
}

export function renderHeatmap(data: UsageData, theme: Theme, x: number, y: number, now: Date): string {
  const grid = heatmapGrid(data, now, WEEKS);
  const cells: string[] = [];
  grid.forEach((column, w) => {
    column.forEach((cell, d) => {
      const cellX = x + w * (CELL + CELL_GAP);
      const cellY = y + d * (CELL + CELL_GAP);
      // Peak days shift to the gradient's far hue and glow.
      if (cell.level === 4) {
        cells.push(
          `<rect class="hm" x="${cellX}" y="${cellY}" width="${CELL}" height="${CELL}" rx="2" fill="${theme.accent2}" filter="url(#cellglow)"/>`,
        );
        return;
      }
      const opacity = cell.level === 0 ? IDLE_OPACITY : LEVEL_OPACITY[cell.level];
      cells.push(
        `<rect class="hm" x="${cellX}" y="${cellY}" width="${CELL}" height="${CELL}" rx="2" fill="${theme.accent}" fill-opacity="${opacity}"/>`,
      );
    });
  });
  return `
  <g class="fade" style="animation-delay:250ms">${cells.join('')}</g>`;
}

/**
 * Month-by-month bars for the last six calendar months, extruded into small
 * isometric 3D blocks (front, side, and top faces): value on top, month label
 * below. The current month is emphasized.
 */
function renderMonthlyBars(data: UsageData, theme: Theme, y: number, now: Date): string {
  const months = monthlyTotals(data, now, MONTHS_SHOWN);
  const max = Math.max(1, ...months.map((m) => m.tokens));
  const colWidth = (CARD_WIDTH - CARD_PADDING * 2) / MONTHS_SHOWN;
  const barMaxHeight = 15;
  const barWidth = 28;
  const depth = 5;
  const barBottom = y + 26;

  const bars = months.map((month, i) => {
    const cx = CARD_PADDING + colWidth * i + colWidth / 2;
    const isCurrent = i === months.length - 1;
    const value = month.tokens > 0 ? formatTokens(month.tokens) : '';
    const labels = `
    <text x="${cx}" y="${y + 6}" text-anchor="middle" font-size="8" fill="${theme.muted}">${value}</text>
    <text x="${cx}" y="${barBottom + 11}" text-anchor="middle" font-size="8" fill="${theme.muted}">${escapeXml(month.label)}</text>`;
    if (month.tokens === 0) return labels;

    const h = Math.max(3, Math.round((month.tokens / max) * barMaxHeight));
    const x = cx - barWidth / 2;
    const top = barBottom - h;
    const frontOpacity = isCurrent ? 0.95 : 0.5;
    return `${labels}
    <polygon points="${x},${top} ${x + depth},${top - depth * 0.6} ${x + barWidth + depth},${top - depth * 0.6} ${x + barWidth},${top}" fill="${theme.accent2}" fill-opacity="${isCurrent ? 1 : 0.6}"/>
    <polygon points="${x + barWidth},${top} ${x + barWidth + depth},${top - depth * 0.6} ${x + barWidth + depth},${barBottom - depth * 0.6} ${x + barWidth},${barBottom}" fill="${theme.accent}" fill-opacity="${frontOpacity * 0.55}"/>
    <rect x="${x}" y="${top}" width="${barWidth}" height="${h}" fill="url(#ag)" opacity="${frontOpacity}"/>`;
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
  <text class="fade" style="animation-delay:150ms" x="${CARD_PADDING}" y="${summaryY}" font-size="12" fill="${theme.text}">${escapeXml(summaryLine(data, now))}</text>
  <text class="fade" style="animation-delay:200ms" x="${CARD_PADDING}" y="${summaryY + 17}" font-size="10" fill="${theme.muted}">${escapeXml(detailLine(data))}</text>`;
  body += renderHeatmap(data, theme, gridX, gridY, now);
  body += renderMonthlyBars(data, theme, monthsY, now);

  return cardShell(
    theme,
    USAGE_CARD_HEIGHT,
    body,
    `${username}: ${formatTokens(totalTokens(data))} AI tokens total, ${formatTokens(monthTotals(data, now).tokens)} this month`,
  );
}

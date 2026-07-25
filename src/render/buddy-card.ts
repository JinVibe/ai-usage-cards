import type { UsageData } from '../usage/types.js';
import { formatTokens, totalTokens } from '../usage/stats.js';
import { cardShell } from './card.js';
import { CARD_PADDING } from './layout.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

/** Sized to sit beside the 450px cards in the same card row. */
export const BUDDY_CARD_WIDTH = 240;
export const BUDDY_CARD_HEIGHT = 260;

/**
 * The buddy is an ORIGINAL sparkle creature — deliberately not any vendor's
 * mascot or logo. It evolves with total recorded tokens.
 */
const LEVELS = [
  { name: 'Spark', min: 0 },
  { name: 'Ember', min: 1_000_000 },
  { name: 'Circuit', min: 10_000_000 },
  { name: 'Dynamo', min: 50_000_000 },
  { name: 'Nova', min: 250_000_000 },
] as const;

export interface BuddyLevel {
  level: number;
  name: string;
  min: number;
  /** Token floor of the next level, or null at max. */
  next: number | null;
}

export function buddyLevel(total: number): BuddyLevel {
  let index = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (total >= (LEVELS[i] as { min: number }).min) {
      index = i;
      break;
    }
  }
  return {
    level: index + 1,
    name: (LEVELS[index] as { name: string }).name,
    min: (LEVELS[index] as { min: number }).min,
    next: index + 1 < LEVELS.length ? (LEVELS[index + 1] as { min: number }).min : null,
  };
}

const SPARKLE = 'M7 0 L8.6 5.4 L14 7 L8.6 8.6 L7 14 L5.4 8.6 L0 7 L5.4 5.4 Z';

/** A sparkle path scaled by `s`, centered on (0,0). */
function sparkle(theme: Theme, s: number, opacity = 1): string {
  return `<path transform="translate(${-7 * s}, ${-7 * s}) scale(${s})" d="${SPARKLE}" fill="${theme.accent}" fill-opacity="${opacity}"/>`;
}

function eyes(theme: Theme, dx: number, y: number, r = 3): string {
  return `<circle cx="${-dx}" cy="${y}" r="${r}" fill="${theme.bg}"/><circle cx="${dx}" cy="${y}" r="${r}" fill="${theme.bg}"/>`;
}

function robotHead(theme: Theme, w: number, h: number, y: number): string {
  return `
      <line x1="0" y1="${y - h / 2 - 12}" x2="0" y2="${y - h / 2}" stroke="${theme.accent}" stroke-width="2"/>
      <g transform="translate(0, ${y - h / 2 - 14})">${sparkle(theme, 0.9)}</g>
      <rect x="${-w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="12" fill="${theme.accent}" fill-opacity="0.16" stroke="${theme.accent}" stroke-width="1.5"/>
      <circle cx="-11" cy="${y - 4}" r="4" fill="${theme.accent}"/><circle cx="11" cy="${y - 4}" r="4" fill="${theme.accent}"/>
      <path d="M-8 ${y + 10} Q0 ${y + 16} 8 ${y + 10}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Evolution stages, each drawn centered on (0,0) in a ~90px box. */
function buddyArt(level: number, theme: Theme): string {
  switch (level) {
    case 1: // Spark — a lone sparkle
      return `
      ${sparkle(theme, 3.4, 0.9)}
      <ellipse cx="0" cy="34" rx="18" ry="4" fill="${theme.accent}" fill-opacity="0.12"/>`;
    case 2: // Ember — the sparkle wakes up
      return `
      ${sparkle(theme, 4.6, 0.95)}
      ${eyes(theme, 7, -4)}
      <ellipse cx="0" cy="40" rx="22" ry="4" fill="${theme.accent}" fill-opacity="0.12"/>`;
    case 3: // Circuit — it grows a head
      return `
      ${robotHead(theme, 62, 54, 2)}
      <ellipse cx="0" cy="44" rx="26" ry="4" fill="${theme.accent}" fill-opacity="0.12"/>`;
    case 4: // Dynamo — a body and arms
      return `
      ${robotHead(theme, 54, 42, -16)}
      <rect x="-20" y="12" width="40" height="30" rx="10" fill="${theme.accent}" fill-opacity="0.16" stroke="${theme.accent}" stroke-width="1.5"/>
      <g transform="translate(0, 27)">${sparkle(theme, 0.8)}</g>
      <line x1="-20" y1="20" x2="-32" y2="30" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="20" y1="20" x2="32" y2="30" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="0" cy="48" rx="28" ry="4" fill="${theme.accent}" fill-opacity="0.12"/>`;
    default: // Nova — crowned, with companions
      return `
      <g transform="translate(-42, -30)">${sparkle(theme, 1.1, 0.55)}</g>
      <g transform="translate(44, -14)">${sparkle(theme, 0.9, 0.55)}</g>
      ${robotHead(theme, 54, 42, -12)}
      <path d="M-16 -40 L-10 -50 L-4 -40 L0 -52 L4 -40 L10 -50 L16 -40 Z" fill="${theme.accent}" fill-opacity="0.85"/>
      <rect x="-20" y="16" width="40" height="30" rx="10" fill="${theme.accent}" fill-opacity="0.16" stroke="${theme.accent}" stroke-width="1.5"/>
      <g transform="translate(0, 31)">${sparkle(theme, 0.8)}</g>
      <line x1="-20" y1="24" x2="-32" y2="16" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="20" y1="24" x2="32" y2="16" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="0" cy="52" rx="28" ry="4" fill="${theme.accent}" fill-opacity="0.12"/>`;
  }
}

/**
 * A small companion card: an original mascot that levels up with total
 * recorded tokens. Same privacy rules as every other card.
 */
export function renderBuddyCard(username: string, data: UsageData, theme: Theme): string {
  const total = totalTokens(data);
  const lvl = buddyLevel(total);
  const cx = BUDDY_CARD_WIDTH / 2;

  const title = truncateToWidth(`${username} · AI buddy`, BUDDY_CARD_WIDTH - CARD_PADDING * 2, 13);
  let body = `
  <text class="fade" x="${cx}" y="32" text-anchor="middle" font-size="13" font-weight="600" fill="${theme.title}">${escapeXml(title)}</text>
  <g class="fade" style="animation-delay:150ms" transform="translate(${cx}, 112)">${buddyArt(lvl.level, theme)}</g>
  <text class="fade" style="animation-delay:300ms" x="${cx}" y="184" text-anchor="middle" font-size="14" font-weight="700" fill="${theme.accent}">Lv.${lvl.level} · ${escapeXml(lvl.name)}</text>
  <text class="fade" style="animation-delay:350ms" x="${cx}" y="201" text-anchor="middle" font-size="10" fill="${theme.muted}">${escapeXml(formatTokens(total))} tokens</text>`;

  const barX = 44;
  const barWidth = BUDDY_CARD_WIDTH - barX * 2;
  const progress = lvl.next === null ? 1 : Math.min(1, (total - lvl.min) / (lvl.next - lvl.min));
  const hint = lvl.next === null ? 'max level' : `${formatTokens(lvl.next - total)} to Lv.${lvl.level + 1}`;
  body += `
  <g class="fade" style="animation-delay:400ms">
    <rect x="${barX}" y="209" width="${barWidth}" height="5" rx="2.5" fill="${theme.accent}" fill-opacity="0.12"/>
    <rect x="${barX}" y="209" width="${Math.max(3, Math.round(barWidth * progress))}" height="5" rx="2.5" fill="${theme.accent}" fill-opacity="0.6"/>
    <text x="${cx}" y="226" text-anchor="middle" font-size="8" fill="${theme.muted}">${escapeXml(hint)}</text>
  </g>`;

  return cardShell(
    theme,
    BUDDY_CARD_HEIGHT,
    body,
    `${username}'s AI buddy: level ${lvl.level} ${lvl.name}, ${formatTokens(total)} tokens`,
    BUDDY_CARD_WIDTH,
  );
}

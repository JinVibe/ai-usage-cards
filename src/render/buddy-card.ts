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

/** Everything stands on this local ground line so no stage floats. */
const GROUND = 48;

function ground(theme: Theme, rx: number): string {
  return `<ellipse cx="0" cy="${GROUND}" rx="${rx}" ry="4" fill="${theme.accent}" fill-opacity="0.12"/>`;
}

/** A robot head whose BOTTOM edge sits at `bottom`. */
function robotHead(theme: Theme, w: number, h: number, bottom: number): string {
  const top = bottom - h;
  const eyeY = bottom - h * 0.55;
  return `
      <line x1="0" y1="${top - 11}" x2="0" y2="${top}" stroke="${theme.accent}" stroke-width="2"/>
      <g transform="translate(0, ${top - 13})">${sparkle(theme, 0.9)}</g>
      <rect x="${-w / 2}" y="${top}" width="${w}" height="${h}" rx="12" fill="${theme.accent}" fill-opacity="0.16" stroke="${theme.accent}" stroke-width="1.5"/>
      <circle cx="-11" cy="${eyeY}" r="4" fill="${theme.accent}"/><circle cx="11" cy="${eyeY}" r="4" fill="${theme.accent}"/>
      <path d="M-8 ${eyeY + 13} Q0 ${eyeY + 19} 8 ${eyeY + 13}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round"/>`;
}

/**
 * Evolution stages, drawn in art-local coordinates where y=GROUND is the
 * floor every stage stands on — consistent placement across all levels.
 */
function buddyArt(level: number, theme: Theme): string {
  switch (level) {
    case 1: { // Spark — a lone sparkle resting on the ground
      const s = 3.2;
      return `
      <g transform="translate(0, ${GROUND - 4 - 7 * s})">${sparkle(theme, s, 0.9)}</g>
      ${ground(theme, 18)}`;
    }
    case 2: { // Ember — the sparkle wakes up
      const s = 4.4;
      const cy = GROUND - 6 - 7 * s;
      return `
      <g transform="translate(0, ${cy})">${sparkle(theme, s, 0.95)}</g>
      <g transform="translate(0, ${cy})">${eyes(theme, 7.5, 2, 3.2)}</g>
      <path d="M-6 ${cy + 11} Q0 ${cy + 15} 6 ${cy + 11}" fill="none" stroke="${theme.bg}" stroke-width="2" stroke-linecap="round"/>
      ${ground(theme, 22)}`;
    }
    case 3: // Circuit — it grows a head
      return `
      ${robotHead(theme, 62, 52, GROUND - 4)}
      ${ground(theme, 30)}`;
    case 4: // Dynamo — a body and arms
      return `
      ${robotHead(theme, 52, 40, GROUND - 34)}
      <rect x="-19" y="${GROUND - 32}" width="38" height="28" rx="10" fill="${theme.accent}" fill-opacity="0.16" stroke="${theme.accent}" stroke-width="1.5"/>
      <g transform="translate(0, ${GROUND - 18})">${sparkle(theme, 0.8)}</g>
      <line x1="-19" y1="${GROUND - 26}" x2="-31" y2="${GROUND - 16}" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="19" y1="${GROUND - 26}" x2="31" y2="${GROUND - 16}" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      ${ground(theme, 28)}`;
    default: // Nova — crowned, arms raised, with companions
      return `
      <g transform="translate(-46, ${GROUND - 62})">${sparkle(theme, 1.1, 0.55)}</g>
      <g transform="translate(46, ${GROUND - 48})">${sparkle(theme, 0.9, 0.55)}</g>
      ${robotHead(theme, 52, 40, GROUND - 34)}
      <path d="M-15 ${GROUND - 76} L-9 ${GROUND - 86} L-3 ${GROUND - 76} L0 ${GROUND - 88} L3 ${GROUND - 76} L9 ${GROUND - 86} L15 ${GROUND - 76} Z" transform="translate(0, 2)" fill="url(#ag)"/>
      <rect x="-19" y="${GROUND - 32}" width="38" height="28" rx="10" fill="${theme.accent}" fill-opacity="0.16" stroke="${theme.accent}" stroke-width="1.5"/>
      <g transform="translate(0, ${GROUND - 18})">${sparkle(theme, 0.8)}</g>
      <line x1="-19" y1="${GROUND - 26}" x2="-31" y2="${GROUND - 36}" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="19" y1="${GROUND - 26}" x2="31" y2="${GROUND - 36}" stroke="${theme.accent}" stroke-width="2.5" stroke-linecap="round"/>
      ${ground(theme, 28)}`;
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
  <circle class="fade" style="animation-delay:100ms" cx="${cx}" cy="124" r="62" fill="url(#glowg)"/>
  <g class="fade" style="animation-delay:150ms" transform="translate(${cx}, 112)">${buddyArt(lvl.level, theme)}</g>
  <text class="fade" style="animation-delay:300ms" x="${cx}" y="184" text-anchor="middle" font-size="14" font-weight="700" fill="url(#ag)">Lv.${lvl.level} · ${escapeXml(lvl.name)}</text>
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

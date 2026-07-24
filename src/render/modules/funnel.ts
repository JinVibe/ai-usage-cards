import type { CardData } from '../../core/types.js';
import { CARD_PADDING, CONTENT_WIDTH } from '../layout.js';
import { escapeXml } from '../svg.js';
import type { Theme } from '../themes.js';

export const FUNNEL_HEIGHT = 84;

const STAGE_GAP = 24;
const STAGE_HEIGHT = 58;
/** Accent intensity rises toward the outcome end of the funnel. */
const STAGE_FILL_OPACITY = [0.06, 0.1, 0.15];
const STAGE_STROKE_OPACITY = [0.15, 0.22, 0.3];

/**
 * The headline module: conversion, not volume.
 * `≥N AI-assisted commits → ≥M merged PRs → K releases`
 * Rendered as three stage chips whose single-hue intensity deepens toward
 * shipped outcomes, joined by chevrons. Counts carry the "at least" framing
 * because trailers are lost on squash merges and PR resolution is sampled.
 */
export function renderFunnel(data: CardData, theme: Theme, y: number): string {
  const stages = [
    { value: `≥${data.commits}`, label: 'AI-assisted commits' },
    { value: `≥${data.mergedPrs}`, label: 'merged PRs' },
    { value: String(data.releases), label: data.releases === 1 ? 'release' : 'releases' },
  ];
  const stageWidth = (CONTENT_WIDTH - STAGE_GAP * (stages.length - 1)) / stages.length;
  const chipY = y + 8;

  const chips = stages.map((stage, i) => {
    const x = CARD_PADDING + (stageWidth + STAGE_GAP) * i;
    const cx = x + stageWidth / 2;
    return `
    <g class="fade" style="animation-delay:${150 + i * 120}ms">
      <rect x="${x}" y="${chipY}" width="${stageWidth}" height="${STAGE_HEIGHT}" rx="8" fill="${theme.accent}" fill-opacity="${STAGE_FILL_OPACITY[i]}" stroke="${theme.accent}" stroke-opacity="${STAGE_STROKE_OPACITY[i]}"/>
      <text x="${cx}" y="${chipY + 27}" text-anchor="middle" font-size="20" font-weight="700" fill="${theme.text}">${escapeXml(stage.value)}</text>
      <text x="${cx}" y="${chipY + 44}" text-anchor="middle" font-size="9.5" fill="${theme.muted}">${escapeXml(stage.label)}</text>
    </g>`;
  });

  const chevrons = [1, 2].map((i) => {
    const cx = CARD_PADDING + stageWidth * i + STAGE_GAP * (i - 0.5);
    const cy = chipY + STAGE_HEIGHT / 2;
    return `
    <path class="fade" style="animation-delay:${210 + i * 120}ms" d="M${cx - 2.5} ${cy - 4.5} l5 4.5 -5 4.5" fill="none" stroke="${theme.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  return chips.join('') + chevrons.join('');
}

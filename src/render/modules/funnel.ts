import { AI_SIGNATURES } from '../../config/ai-signatures.js';
import type { CardData } from '../../core/types.js';
import { CARD_PADDING, CONTENT_WIDTH } from '../layout.js';
import { escapeXml, truncateToWidth } from '../svg.js';
import type { Theme } from '../themes.js';

const STAGE_GAP = 24;
const STAGE_HEIGHT = 62;
const AGENTS_LINE_HEIGHT = 22;
export const FUNNEL_HEIGHT = 10 + STAGE_HEIGHT + 4 + AGENTS_LINE_HEIGHT;

/** Accent intensity rises toward the outcome end of the funnel. */
const STAGE_FILL_OPACITY = [0.06, 0.1, 0.15];
const STAGE_STROKE_OPACITY = [0.15, 0.22, 0.3];

function agentLabel(id: string): string {
  return AI_SIGNATURES.find((sig) => sig.id === id)?.label ?? id;
}

/** `with Claude ×12 · GitHub Copilot ×3` — which agents were directed. */
function agentsLine(data: CardData, theme: Theme, y: number): string {
  if (data.agentCounts.length === 0) return '';
  const shown = data.agentCounts.slice(0, 3);
  const spans = shown
    .map(
      (a) =>
        `<tspan fill="${theme.accent}" font-weight="600">${escapeXml(agentLabel(a.id))}</tspan><tspan fill="${theme.muted}"> ×${a.commits}</tspan>`,
    )
    .join(`<tspan fill="${theme.muted}"> · </tspan>`);
  const extra = data.agentCounts.length > shown.length
    ? `<tspan fill="${theme.muted}"> +${data.agentCounts.length - shown.length} more</tspan>`
    : '';
  return `
    <text class="fade" style="animation-delay:420ms" x="${CARD_PADDING}" y="${y}" font-size="10.5" fill="${theme.muted}">with ${spans}${extra}</text>`;
}

/**
 * The headline module: conversion, not volume.
 * `≥N AI-assisted commits → ≥M merged PRs → K releases`
 * Rendered as three stage chips whose single-hue intensity deepens toward
 * shipped outcomes, joined by chevrons, followed by a line naming the agents
 * that were directed. Counts carry the "at least" framing because trailers
 * are lost on squash merges and PR resolution is sampled.
 */
export function renderFunnel(data: CardData, theme: Theme, y: number): string {
  const stages = [
    { value: `≥${data.commits}`, label: 'AI-assisted commits' },
    { value: `≥${data.mergedPrs}`, label: 'merged PRs' },
    { value: String(data.releases), label: data.releases === 1 ? 'release' : 'releases' },
  ];
  const stageWidth = (CONTENT_WIDTH - STAGE_GAP * (stages.length - 1)) / stages.length;
  const chipY = y + 10;

  const chips = stages.map((stage, i) => {
    const x = CARD_PADDING + (stageWidth + STAGE_GAP) * i;
    const cx = x + stageWidth / 2;
    const value = truncateToWidth(stage.value, stageWidth - 12, 24);
    return `
    <g class="fade" style="animation-delay:${150 + i * 120}ms">
      <rect x="${x}" y="${chipY}" width="${stageWidth}" height="${STAGE_HEIGHT}" rx="9" fill="${theme.accent}" fill-opacity="${STAGE_FILL_OPACITY[i]}" stroke="${theme.accent}" stroke-opacity="${STAGE_STROKE_OPACITY[i]}" filter="url(#soft)"/>
      <text x="${cx}" y="${chipY + 31}" text-anchor="middle" font-size="24" font-weight="800" fill="url(#ag)">${escapeXml(value)}</text>
      <text x="${cx}" y="${chipY + 48}" text-anchor="middle" font-size="10" fill="${theme.muted}">${escapeXml(stage.label)}</text>
    </g>`;
  });

  const chevrons = [1, 2].map((i) => {
    const cx = CARD_PADDING + stageWidth * i + STAGE_GAP * (i - 0.5);
    const cy = chipY + STAGE_HEIGHT / 2;
    return `
    <path class="fade" style="animation-delay:${210 + i * 120}ms" d="M${cx - 2.5} ${cy - 4.5} l5 4.5 -5 4.5" fill="none" stroke="${theme.muted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  });

  return chips.join('') + chevrons.join('') + agentsLine(data, theme, chipY + STAGE_HEIGHT + 18);
}

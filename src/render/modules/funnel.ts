import type { CardData } from '../../core/types.js';
import { CARD_PADDING, CONTENT_WIDTH } from '../layout.js';
import { escapeXml } from '../svg.js';
import type { Theme } from '../themes.js';

export const FUNNEL_HEIGHT = 84;

/**
 * The headline module: conversion, not volume.
 * `≥N AI-assisted commits → ≥M merged PRs → K releases`
 * Commit and PR counts carry the "at least" framing because trailers are lost
 * on squash merges and PR resolution is sampled.
 */
export function renderFunnel(data: CardData, theme: Theme, y: number): string {
  const columns = [
    { value: `≥${data.commits}`, label: 'AI-assisted commits' },
    { value: `≥${data.mergedPrs}`, label: 'merged PRs' },
    { value: String(data.releases), label: data.releases === 1 ? 'release' : 'releases' },
  ];
  const colWidth = CONTENT_WIDTH / columns.length;
  const numberY = y + 34;
  const labelY = y + 56;

  const parts = columns.map((col, i) => {
    const cx = CARD_PADDING + colWidth * i + colWidth / 2;
    return `
    <text x="${cx}" y="${numberY}" text-anchor="middle" font-size="22" font-weight="700" fill="${theme.text}">${escapeXml(col.value)}</text>
    <text x="${cx}" y="${labelY}" text-anchor="middle" font-size="10" fill="${theme.muted}">${escapeXml(col.label)}</text>`;
  });

  const arrows = [1, 2].map((i) => {
    const ax = CARD_PADDING + colWidth * i;
    return `
    <text x="${ax}" y="${numberY - 7}" text-anchor="middle" font-size="14" fill="${theme.muted}">→</text>`;
  });

  return parts.join('') + arrows.join('');
}

import { cardShell } from './card.js';
import { CARD_PADDING, CARD_WIDTH } from './layout.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

const MESSAGE_CARD_HEIGHT = 120;
const TEXT_BUDGET = CARD_WIDTH - CARD_PADDING * 2;

function messageCard(theme: Theme, title: string, headline: string, hint: string): string {
  const body = `
  <text x="${CARD_PADDING}" y="33" font-size="14" font-weight="600" fill="${theme.title}">${escapeXml(truncateToWidth(title, TEXT_BUDGET, 14))}</text>
  <text x="${CARD_PADDING}" y="66" font-size="12" fill="${theme.text}">${escapeXml(truncateToWidth(headline, TEXT_BUDGET, 12))}</text>
  <text x="${CARD_PADDING}" y="86" font-size="10" fill="${theme.muted}">${escapeXml(truncateToWidth(hint, TEXT_BUDGET, 10))}</text>`;
  return cardShell(theme, MESSAGE_CARD_HEIGHT, body, headline);
}

/**
 * Valid user, zero matching commits. A normal-looking card, not an error —
 * cached like any other result.
 */
export function renderEmptyCard(username: string, theme: Theme): string {
  return messageCard(
    theme,
    `${username} · AI-assisted shipping`,
    'No AI co-authored commits found in public repos — yet.',
    'Trailers are lost on squash merges; counts only cover public default branches.',
  );
}

export type CardErrorKind = 'invalid-username' | 'user-not-found' | 'rate-limited' | 'upstream';

const ERROR_COPY: Record<CardErrorKind, { headline: string; hint: string }> = {
  'invalid-username': {
    headline: 'Missing or invalid username parameter.',
    hint: 'Use /api/card?username=<your-github-login>',
  },
  'user-not-found': {
    headline: 'GitHub user not found.',
    hint: 'Check the username spelling in the card URL.',
  },
  'rate-limited': {
    headline: 'Temporarily rate limited by the GitHub API.',
    hint: 'The card will refresh automatically — try again in a minute.',
  },
  upstream: {
    headline: 'GitHub API is unavailable right now.',
    hint: 'The card will refresh automatically — try again later.',
  },
};

/** Always renders a valid SVG so the README <img> never breaks. */
export function renderErrorCard(kind: CardErrorKind, theme: Theme): string {
  const copy = ERROR_COPY[kind];
  return messageCard(theme, 'ai-usage-cards', copy.headline, copy.hint);
}

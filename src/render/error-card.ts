import { cardShell } from './card.js';
import { CARD_PADDING, CARD_WIDTH } from './layout.js';
import { escapeXml, truncateToWidth } from './svg.js';
import type { Theme } from './themes.js';

const MESSAGE_CARD_HEIGHT = 120;
const TEXT_BUDGET = CARD_WIDTH - CARD_PADDING * 2;

function messageCard(theme: Theme, title: string, headline: string, hint: string): string {
  const body = `
  <text class="fade" x="${CARD_PADDING}" y="33" font-size="14" font-weight="600" fill="${theme.title}">${escapeXml(truncateToWidth(title, TEXT_BUDGET, 14))}</text>
  <text class="fade" style="animation-delay:120ms" x="${CARD_PADDING}" y="66" font-size="12" fill="${theme.text}">${escapeXml(truncateToWidth(headline, TEXT_BUDGET, 12))}</text>
  <text class="fade" style="animation-delay:240ms" x="${CARD_PADDING}" y="86" font-size="10" fill="${theme.muted}">${escapeXml(truncateToWidth(hint, TEXT_BUDGET, 10))}</text>`;
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

/** Valid gist, but no usage entries yet — the collector has not run. */
export function renderUsageEmptyCard(username: string, theme: Theme): string {
  return messageCard(
    theme,
    `${username} · AI at work`,
    'No usage data collected yet.',
    'Run the collector once per machine — see the repo README for setup.',
  );
}

export type CardErrorKind =
  | 'invalid-username'
  | 'invalid-usage-params'
  | 'user-not-found'
  | 'gist-not-found'
  | 'rate-limited'
  | 'upstream';

const ERROR_COPY: Record<CardErrorKind, { headline: string; hint: string }> = {
  'invalid-username': {
    headline: 'Missing or invalid username parameter.',
    hint: 'Use /api/card?username=<your-github-login>',
  },
  'invalid-usage-params': {
    headline: 'Missing or invalid username or gist parameter.',
    hint: 'Use /api/usage-card?username=<login>&gist=<gist-id>',
  },
  'gist-not-found': {
    headline: 'Usage gist not found.',
    hint: 'Check the gist id in the card URL — the gist must exist (secret is fine).',
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

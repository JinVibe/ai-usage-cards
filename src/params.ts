import { cardModules } from './render/card.js';

/** GitHub login rules: alphanumeric and inner hyphens, max 39 chars. */
const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export const DEFAULT_MODULES = ['funnel'];

export interface CardParams {
  username: string;
  /** Validated module names, in request order. Defaults to the headline funnel. */
  modules: string[];
  /** Raw theme name; resolveTheme handles unknown values. */
  theme: string | undefined;
}

type QueryValue = string | string[] | undefined;

function first(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parses and validates the query. Returns null when the username is missing
 * or malformed (the caller renders an invalid-username card). Unknown modules
 * and themes are silently ignored — a typo must never break a README.
 */
export function parseCardParams(query: Record<string, QueryValue>): CardParams | null {
  const username = first(query.username)?.trim() ?? '';
  if (!USERNAME_RE.test(username)) return null;

  const requested = (first(query.modules) ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m in cardModules);
  const modules = requested.length > 0 ? [...new Set(requested)] : DEFAULT_MODULES;

  return { username, modules, theme: first(query.theme) };
}

/** SVG string primitives: escaping and deterministic text measurement. */

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const NARROW = /[iljI.,:;'|!\[\]()f tr]/;
const WIDE = /[mwMW@]/;
const CJK = /[ᄀ-ᇿ　-鿿가-힯豈-﫿＀-￯]/;

/**
 * Approximate rendered width in px for the default sans-serif stack.
 * Deterministic (no canvas/font dependencies) so truncation is unit-testable;
 * errs slightly wide so text never overflows the card.
 */
export function approxTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) {
    if (CJK.test(ch)) em += 1.0;
    else if (WIDE.test(ch)) em += 0.9;
    else if (NARROW.test(ch)) em += 0.32;
    else if (/[A-Z0-9]/.test(ch)) em += 0.68;
    else em += 0.55;
  }
  return em * fontSize;
}

/** Truncates with an ellipsis so the text fits within maxWidth px. */
export function truncateToWidth(text: string, maxWidth: number, fontSize: number): string {
  if (approxTextWidth(text, fontSize) <= maxWidth) return text;
  const ellipsis = '…';
  const chars = [...text];
  while (chars.length > 0) {
    chars.pop();
    const candidate = chars.join('') + ellipsis;
    if (approxTextWidth(candidate, fontSize) <= maxWidth) return candidate;
  }
  return ellipsis;
}

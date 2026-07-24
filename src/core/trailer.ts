import { AI_SIGNATURES, type AiSignature } from '../config/ai-signatures.js';

/**
 * Privacy boundary: this module parses `Co-authored-by:` trailers (which
 * contain emails) and returns only signature ids. Emails never leave this
 * module.
 */

const TRAILER_RE = /^co-authored-by:\s*(.*?)\s*<([^<>]+)>\s*$/gim;

interface Trailer {
  name: string;
  email: string;
}

function parseTrailers(message: string): Trailer[] {
  const trailers: Trailer[] = [];
  for (const match of message.matchAll(TRAILER_RE)) {
    trailers.push({ name: (match[1] ?? '').trim(), email: (match[2] ?? '').trim() });
  }
  return trailers;
}

function matchSignature(trailer: Trailer, signatures: AiSignature[]): string | null {
  const email = trailer.email.toLowerCase();
  for (const sig of signatures) {
    if (sig.emails.includes(email)) return sig.id;
  }
  for (const sig of signatures) {
    if (sig.namePatterns.some((re) => re.test(trailer.name))) return sig.id;
  }
  return null;
}

/**
 * Returns the deduplicated signature ids of AI agents credited as co-authors
 * in the given commit message. Empty array means no known AI co-author.
 */
export function matchAiSignatures(
  message: string,
  signatures: AiSignature[] = AI_SIGNATURES,
): string[] {
  const ids = new Set<string>();
  for (const trailer of parseTrailers(message)) {
    const id = matchSignature(trailer, signatures);
    if (id !== null) ids.add(id);
  }
  return [...ids];
}

import { describe, expect, it } from 'vitest';
import { matchAiSignatures } from '../src/core/trailer.js';

const claudeMessage = `feat: add caching layer

Implements TTL-based caching.

Co-Authored-By: Claude <noreply@anthropic.com>`;

describe('matchAiSignatures', () => {
  it('matches a Claude co-author trailer by email', () => {
    expect(matchAiSignatures(claudeMessage)).toEqual(['claude']);
  });

  it('is case-insensitive on the trailer key and email', () => {
    const msg = 'fix: x\n\nco-authored-by: claude <NOREPLY@ANTHROPIC.COM>';
    expect(matchAiSignatures(msg)).toEqual(['claude']);
  });

  it('returns empty for messages without trailers', () => {
    expect(matchAiSignatures('fix: plain human commit')).toEqual([]);
  });

  it('ignores human co-authors', () => {
    const msg = 'feat: pair work\n\nCo-authored-by: Jane Doe <jane@example.com>';
    expect(matchAiSignatures(msg)).toEqual([]);
  });

  it('deduplicates repeated trailers from the same agent', () => {
    const msg = [
      'feat: y',
      '',
      'Co-authored-by: Claude <noreply@anthropic.com>',
      'Co-authored-by: Claude Opus <noreply@anthropic.com>',
    ].join('\n');
    expect(matchAiSignatures(msg)).toEqual(['claude']);
  });

  it('collects multiple distinct agents', () => {
    const msg = [
      'feat: z',
      '',
      'Co-authored-by: Claude <noreply@anthropic.com>',
      'Co-authored-by: Copilot <175728472+Copilot@users.noreply.github.com>',
    ].join('\n');
    expect(matchAiSignatures(msg).sort()).toEqual(['claude', 'copilot']);
  });

  it('falls back to name patterns for unknown noreply emails', () => {
    const msg = 'feat: w\n\nCo-authored-by: devin-ai-integration[bot] <158243242+devin-ai-integration[bot]@users.noreply.github.com>';
    expect(matchAiSignatures(msg)).toEqual(['devin']);
  });

  it('never returns anything containing an email address', () => {
    const results = matchAiSignatures(claudeMessage);
    for (const id of results) {
      expect(id).not.toContain('@');
    }
  });
});

import { describe, expect, it } from 'vitest';
import { parseCardParams } from '../src/params.js';

describe('parseCardParams', () => {
  it('accepts a plain username with defaults', () => {
    expect(parseCardParams({ username: 'octo-cat' })).toEqual({
      username: 'octo-cat',
      modules: ['funnel'],
      theme: undefined,
    });
  });

  it('rejects missing, malformed, or dangerous usernames', () => {
    for (const bad of [undefined, '', '-lead', 'trail-', 'a..b', 'a b', '<svg>', 'a'.repeat(40)]) {
      expect(parseCardParams({ username: bad })).toBeNull();
    }
  });

  it('parses the modules list, dropping unknown names', () => {
    const params = parseCardParams({ username: 'octo', modules: 'repos,funnel,leaderboard' });
    expect(params?.modules).toEqual(['repos', 'funnel']);
  });

  it('falls back to the default module when all requested are unknown', () => {
    const params = parseCardParams({ username: 'octo', modules: 'leaderboard' });
    expect(params?.modules).toEqual(['funnel']);
  });

  it('passes the theme through for the resolver to handle', () => {
    expect(parseCardParams({ username: 'octo', theme: 'dark' })?.theme).toBe('dark');
  });

  it('uses the first value of repeated query params', () => {
    expect(parseCardParams({ username: ['octo', 'evil'] })?.username).toBe('octo');
  });
});

import { describe, expect, it } from 'vitest';
import { TtlCache } from '../src/core/cache.js';

describe('TtlCache', () => {
  it('coalesces concurrent requests into one computation', async () => {
    let clock = 0;
    const cache = new TtlCache<string>(1000, () => clock);
    let calls = 0;
    const compute = async () => {
      calls++;
      return 'value';
    };

    const [a, b] = await Promise.all([
      cache.getOrCompute('k', compute),
      cache.getOrCompute('k', compute),
    ]);
    expect(a).toBe('value');
    expect(b).toBe('value');
    expect(calls).toBe(1);
  });

  it('recomputes after the TTL expires', async () => {
    let clock = 0;
    const cache = new TtlCache<number>(1000, () => clock);
    let calls = 0;
    const compute = async () => ++calls;

    expect(await cache.getOrCompute('k', compute)).toBe(1);
    clock = 999;
    expect(await cache.getOrCompute('k', compute)).toBe(1);
    clock = 1001;
    expect(await cache.getOrCompute('k', compute)).toBe(2);
  });

  it('evicts failed computations so the next request retries', async () => {
    const cache = new TtlCache<string>(1000, () => 0);
    let calls = 0;
    const failing = async () => {
      calls++;
      throw new Error('boom');
    };

    await expect(cache.getOrCompute('k', failing)).rejects.toThrow('boom');
    await expect(cache.getOrCompute('k', failing)).rejects.toThrow('boom');
    expect(calls).toBe(2);
  });
});

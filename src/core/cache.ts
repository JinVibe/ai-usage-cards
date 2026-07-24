/**
 * In-function TTL memo with request coalescing. The in-flight promise is
 * cached immediately, so the near-simultaneous light+dark double fetch from a
 * `<picture>` embed costs a single GitHub round-trip on a warm instance.
 * Failed computations are evicted so the next request retries.
 */

interface Entry<T> {
  promise: Promise<T>;
  expiresAt: number;
}

const MAX_ENTRIES = 500;

export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  getOrCompute(key: string, compute: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > this.now()) return existing.promise;

    const promise = compute();
    this.entries.set(key, { promise, expiresAt: this.now() + this.ttlMs });
    promise.catch(() => {
      if (this.entries.get(key)?.promise === promise) this.entries.delete(key);
    });

    if (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    return promise;
  }
}

export type RateLimiter = {
  /** Records an attempt for `key`; `ok: false` once the key used up its attempts inside the window. */
  hit(key: string): { ok: true } | { ok: false; retryAfterMs: number };
};

/**
 * Sliding-window limiter held in memory (per server process; a restart resets it).
 * Rejected attempts are not recorded, so a blocked client is released exactly `windowMs`
 * after its oldest counted attempt instead of being locked out for longer by retrying.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }): RateLimiter {
  const { limit, windowMs, now = Date.now, maxKeys = 10_000 } = opts;
  const hits = new Map<string, number[]>();

  const prune = (t: number) => {
    for (const [key, stamps] of hits) {
      if (stamps.every((s) => t - s >= windowMs)) hits.delete(key);
    }
  };

  return {
    hit(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((s) => t - s < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterMs: windowMs - (t - recent[0]) };
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > maxKeys) prune(t);
      return { ok: true };
    },
  };
}

/** First hop of `x-forwarded-for` (the client as seen by the nearest proxy), else "unknown". */
export function clientKey(forwardedFor: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first ? first : "unknown";
}

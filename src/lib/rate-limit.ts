export type RateLimiter = {
  /** True while `key` still has attempts left in the window. Does not record anything. */
  check(key: string): boolean;
  /** Records an attempt for `key`; false (and nothing recorded) once the key used up its attempts inside the window. */
  hit(key: string): boolean;
  /** Number of tracked keys (for tests / monitoring). */
  size(): number;
};

/**
 * Sliding-window limiter held in memory (per server process; a restart resets it).
 * Rejected attempts are not recorded, so a blocked client is released exactly `windowMs`
 * after its oldest counted attempt. Memory is bounded: at most `maxKeys` keys; when full,
 * expired keys are pruned first, then the oldest keys (Map insertion order) are evicted.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }): RateLimiter {
  const { limit, windowMs, now = Date.now, maxKeys = 10_000 } = opts;
  const hits = new Map<string, number[]>();

  const recentOf = (key: string, t: number) => (hits.get(key) ?? []).filter((s) => t - s < windowMs);

  const makeRoom = (t: number) => {
    for (const [key, stamps] of hits) {
      if (stamps.every((s) => t - s >= windowMs)) hits.delete(key);
    }
    for (const key of hits.keys()) {
      if (hits.size < maxKeys) break;
      hits.delete(key);
    }
  };

  return {
    check: (key) => recentOf(key, now()).length < limit,
    hit(key) {
      const t = now();
      const recent = recentOf(key, t);
      if (recent.length >= limit) return false;
      recent.push(t);
      hits.delete(key); // re-insert so the Map order tracks recency of activity
      if (hits.size >= maxKeys) makeRoom(t);
      hits.set(key, recent);
      return true;
    },
    size: () => hits.size,
  };
}

/**
 * The client address, or null when it can't be trusted. `x-forwarded-for` is client-controllable, so it is
 * only used when TRUST_PROXY_HOPS is a positive integer n: the n-th entry from the RIGHT is the address
 * appended by our own nearest trusted proxy.
 */
export function clientIp(headers: { get(name: string): string | null }, env: Record<string, string | undefined> = process.env): string | null {
  const raw = env.TRUST_PROXY_HOPS?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  const hops = Number(raw);
  if (hops < 1) return null;
  const parts = (headers.get("x-forwarded-for") ?? "").split(",").map((p) => p.trim());
  const ip = parts[parts.length - hops];
  return ip ? ip : null;
}

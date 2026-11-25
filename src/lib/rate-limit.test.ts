import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` attempts then blocks until the window passes", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect(rl.hit("a").ok).toBe(true);
    t = 100;
    expect(rl.hit("a").ok).toBe(true);
    t = 200;
    expect(rl.hit("a").ok).toBe(true);
    t = 300;
    const blocked = rl.hit("a");
    expect(blocked).toEqual({ ok: false, retryAfterMs: 700 });
    t = 999;
    expect(rl.hit("a").ok).toBe(false);
    t = 1000; // the first attempt just left the window
    expect(rl.hit("a").ok).toBe(true);
  });

  it("does not extend the block when blocked clients keep trying", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(rl.hit("a").ok).toBe(true);
    for (t = 100; t < 1000; t += 100) expect(rl.hit("a").ok).toBe(false);
    t = 1000;
    expect(rl.hit("a").ok).toBe(true);
  });

  it("keeps keys independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(rl.hit("a").ok).toBe(true);
    expect(rl.hit("b").ok).toBe(true);
    expect(rl.hit("a").ok).toBe(false);
  });

  it("evicts idle keys when the map grows past maxKeys", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 10, now: () => t, maxKeys: 2 });
    rl.hit("a");
    rl.hit("b");
    t = 50;
    rl.hit("c"); // triggers prune of a and b
    expect(rl.hit("a").ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("takes the first forwarded hop", () => {
    expect(clientKey("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
    expect(clientKey(" 198.51.100.2 ")).toBe("198.51.100.2");
  });
  it("falls back to unknown", () => {
    expect(clientKey(null)).toBe("unknown");
    expect(clientKey("")).toBe("unknown");
    expect(clientKey(" , 1.2.3.4")).toBe("unknown");
  });
});

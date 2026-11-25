import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` attempts then blocks until the window passes", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect(rl.hit("a")).toBe(true);
    t = 100;
    expect(rl.hit("a")).toBe(true);
    t = 200;
    expect(rl.hit("a")).toBe(true);
    t = 300;
    expect(rl.hit("a")).toBe(false);
    t = 999;
    expect(rl.hit("a")).toBe(false);
    t = 1000; // the first attempt just left the window
    expect(rl.hit("a")).toBe(true);
  });

  it("does not extend the block when blocked clients keep trying", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(rl.hit("a")).toBe(true);
    for (t = 100; t < 1000; t += 100) expect(rl.hit("a")).toBe(false);
    t = 1000;
    expect(rl.hit("a")).toBe(true);
  });

  it("keeps keys independent", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(rl.hit("a")).toBe(true);
    expect(rl.hit("b")).toBe(true);
    expect(rl.hit("a")).toBe(false);
  });

  it("check() never records", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    for (let i = 0; i < 5; i++) expect(rl.check("a")).toBe(true);
    expect(rl.hit("a")).toBe(true);
    expect(rl.check("a")).toBe(false);
  });

  it("prunes expired keys first when full", () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 10, now: () => t, maxKeys: 2 });
    rl.hit("a");
    t = 5;
    rl.hit("b");
    t = 12; // a expired, b still live
    rl.hit("c");
    expect(rl.size()).toBe(2);
    expect(rl.check("b")).toBe(false); // b was kept
  });

  it("keeps size <= maxKeys by evicting the oldest keys when nothing has expired", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0, maxKeys: 3 });
    for (const k of ["a", "b", "c", "d", "e"]) {
      rl.hit(k);
      expect(rl.size()).toBeLessThanOrEqual(3);
    }
    expect(rl.size()).toBe(3);
    expect(rl.check("a")).toBe(true); // oldest evicted
    expect(rl.check("e")).toBe(false); // newest kept
  });
});

describe("clientIp", () => {
  const h = (v: string | null) => ({ get: (n: string) => (n === "x-forwarded-for" ? v : null) });
  it("ignores x-forwarded-for without TRUST_PROXY_HOPS", () => {
    expect(clientIp(h("1.1.1.1, 2.2.2.2"), {})).toBeNull();
    expect(clientIp(h("1.1.1.1"), { TRUST_PROXY_HOPS: "" })).toBeNull();
    expect(clientIp(h("1.1.1.1"), { TRUST_PROXY_HOPS: "0" })).toBeNull();
    expect(clientIp(h("1.1.1.1"), { TRUST_PROXY_HOPS: "abc" })).toBeNull();
  });
  it("takes the n-th entry from the right", () => {
    const spoofed = "6.6.6.6, 203.0.113.9, 10.0.0.1";
    expect(clientIp(h(spoofed), { TRUST_PROXY_HOPS: "1" })).toBe("10.0.0.1");
    expect(clientIp(h(spoofed), { TRUST_PROXY_HOPS: "2" })).toBe("203.0.113.9");
    expect(clientIp(h(spoofed), { TRUST_PROXY_HOPS: "3" })).toBe("6.6.6.6");
  });
  it("returns null when the header is missing or too short", () => {
    expect(clientIp(h(null), { TRUST_PROXY_HOPS: "1" })).toBeNull();
    expect(clientIp(h("1.1.1.1"), { TRUST_PROXY_HOPS: "2" })).toBeNull();
  });
});

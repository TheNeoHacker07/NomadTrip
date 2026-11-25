import { createRateLimiter } from "./rate-limit";

const WINDOW_MS = 10 * 60 * 1000;
type Clock = { now?: () => number };

/** Manage-booking lookups: 10 / 10 min per normalised reference (always) plus per IP when it is known. */
export function createLookupGuard(clock: Clock = {}) {
  const byReference = createRateLimiter({ limit: 10, windowMs: WINDOW_MS, ...clock });
  const byIp = createRateLimiter({ limit: 10, windowMs: WINDOW_MS, ...clock });
  return {
    /** Records the attempt; false when the reference or IP is over its quota (nothing is recorded then). */
    attempt(reference: string, ip: string | null): boolean {
      if (!byReference.check(reference) || (ip !== null && !byIp.check(ip))) return false;
      byReference.hit(reference);
      if (ip !== null) byIp.hit(ip);
      return true;
    },
  };
}

/** Inquiries: 5 / 10 min per IP (when known) plus a global 30 / 10 min cap. Only stored inquiries count. */
export function createInquiryGuard(clock: Clock = {}) {
  const byIp = createRateLimiter({ limit: 5, windowMs: WINDOW_MS, ...clock });
  const all = createRateLimiter({ limit: 30, windowMs: WINDOW_MS, ...clock });
  const KEY = "all";
  return {
    allowed: (ip: string | null) => all.check(KEY) && (ip === null || byIp.check(ip)),
    /** Call after a successful insert (`bot: false`) or a honeypot hit (`bot: true`, global quota only). */
    record(ip: string | null, bot: boolean) {
      all.hit(KEY);
      if (ip !== null && !bot) byIp.hit(ip);
    },
  };
}

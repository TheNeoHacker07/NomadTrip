import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Checks an HTTP Basic `Authorization` header against ADMIN_USER / ADMIN_PASSWORD.
 * Fails closed: with no ADMIN_PASSWORD configured, nobody is an admin.
 */
export function isAdminAuthorization(header: string | null): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !header?.startsWith("Basic ")) return false;
  const expected = `${process.env.ADMIN_USER ?? "admin"}:${password}`;
  const given = Buffer.from(header.slice(6), "base64").toString("utf8");
  return timingSafeEqual(digest(given), digest(expected));
}

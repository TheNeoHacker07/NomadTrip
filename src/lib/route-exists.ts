import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { bookings, trips } from "@/db/schema";

const REFERENCE_RE = /^NT-[A-Z2-9]{8}$/;

/**
 * Cheap existence check for the detail routes that would otherwise stream a not-found UI with HTTP 200
 * (their `notFound()` runs inside a Suspense boundary, after the response status is fixed).
 * Returns false only when the path is one of those routes AND its slug / reference is unknown. Every other
 * path returns true (the page itself stays the source of truth, including seat data).
 */
export function detailRouteExists(db: Db, pathnameWithoutLocale: string): boolean {
  const parts = pathnameWithoutLocale.split("/").filter(Boolean);
  if (parts[0] === "trips" && parts[1] && (parts.length === 2 || (parts.length === 3 && parts[2] === "book"))) {
    return Boolean(db.select({ id: trips.id }).from(trips).where(eq(trips.slug, decode(parts[1]))).get());
  }
  if (parts[0] === "bookings" && parts[1] && parts.length === 2) {
    const ref = decode(parts[1]);
    return REFERENCE_RE.test(ref) && Boolean(db.select({ id: bookings.id }).from(bookings).where(eq(bookings.reference, ref)).get());
  }
  return true;
}

function decode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

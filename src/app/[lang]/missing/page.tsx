import { notFound } from "next/navigation";

/**
 * Rewrite target for `src/proxy.ts` when a trip slug or booking reference does not exist. `notFound()` runs here
 * during prerendering (no Suspense, no request data), so the response is a real HTTP 404 that still renders
 * the normal layout with the not-found UI.
 */
export default function Missing() {
  notFound();
}

"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { lookupBooking, normalizeReference, type ManageBookingView } from "@/lib/manage-booking";
import { clientIp } from "@/lib/rate-limit";
import { createLookupGuard } from "@/lib/request-limits";

export type ManageState =
  | { status: "idle" }
  | { status: "error"; code: "notFound" | "tooMany" | "invalid" }
  | { status: "found"; view: ManageBookingView };

const guard = createLookupGuard();

/** Public endpoint. Wrong reference and wrong email are deliberately indistinguishable (`notFound`). */
export async function lookupAction(_prev: ManageState, formData: FormData): Promise<ManageState> {
  if (!(formData instanceof FormData) || !isLocale(formData.get("lang"))) return { status: "error", code: "invalid" };
  const reference = formData.get("reference");
  const email = formData.get("email");
  if (typeof reference !== "string" || typeof email !== "string" || !reference.trim() || !email.trim()) {
    return { status: "error", code: "invalid" };
  }
  const ip = clientIp(await headers());
  const refKey = normalizeReference(reference.slice(0, 40));
  if (!guard.attempt(refKey, ip)) return { status: "error", code: "tooMany" };

  const view = lookupBooking(db, reference.slice(0, 40), email.slice(0, 200));
  return view ? { status: "found", view } : { status: "error", code: "notFound" };
}

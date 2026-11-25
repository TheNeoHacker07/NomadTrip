"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { lookupBooking, type ManageBookingView } from "@/lib/manage-booking";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

export type ManageState =
  | { status: "idle" }
  | { status: "error"; code: "notFound" | "tooMany" | "invalid" }
  | { status: "found"; view: ManageBookingView };

// 10 attempts per client IP per 10 minutes. In memory: per server process, reset on restart.
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** Public endpoint. Wrong reference and wrong email are deliberately indistinguishable (`notFound`). */
export async function lookupAction(_prev: ManageState, formData: FormData): Promise<ManageState> {
  if (!(formData instanceof FormData) || !isLocale(formData.get("lang"))) return { status: "error", code: "invalid" };
  const reference = formData.get("reference");
  const email = formData.get("email");
  if (typeof reference !== "string" || typeof email !== "string" || !reference.trim() || !email.trim()) {
    return { status: "error", code: "invalid" };
  }
  const key = clientKey((await headers()).get("x-forwarded-for"));
  if (!limiter.hit(key).ok) return { status: "error", code: "tooMany" };

  const view = lookupBooking(db, reference.slice(0, 40), email.slice(0, 200));
  return view ? { status: "found", view } : { status: "error", code: "notFound" };
}

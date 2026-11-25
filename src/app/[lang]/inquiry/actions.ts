"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { submitInquiry, type InquiryErrorCode, type InquiryFieldErrors } from "@/lib/inquiry";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

export type InquiryFormState =
  | { status: "idle" | "sent"; errors?: undefined; message?: undefined }
  | { status: "error"; errors: InquiryFieldErrors; message: "check_fields" | "invalid_submission" | "too_many" };

// 5 requests per client IP per 10 minutes (in memory, per process) so the form can't be used to flood the admin list.
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

export async function submitInquiryAction(_prev: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  if (!(formData instanceof FormData) || !isLocale(formData.get("lang"))) {
    return { status: "error", errors: {}, message: "invalid_submission" };
  }
  // Bots that fill the honeypot get the success state without consuming quota or storing anything.
  const isBot = String(formData.get("website") ?? "").trim() !== "";
  if (!isBot && !limiter.hit(clientKey((await headers()).get("x-forwarded-for"))).ok) {
    return { status: "error", errors: {}, message: "too_many" };
  }
  const res = submitInquiry(db, formData);
  if (!res.ok) return { status: "error", errors: res.errors, message: "check_fields" };
  return { status: "sent" };
}

export type { InquiryErrorCode };

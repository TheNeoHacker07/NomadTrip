"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { submitInquiry, type InquiryErrorCode, type InquiryFieldErrors } from "@/lib/inquiry";
import { clientIp } from "@/lib/rate-limit";
import { createInquiryGuard } from "@/lib/request-limits";

export type InquiryFormState =
  | { status: "idle" | "sent"; errors?: undefined; message?: undefined }
  | { status: "error"; errors: InquiryFieldErrors; message: "check_fields" | "invalid_submission" | "too_many" };

// Quotas live in createInquiryGuard (per IP when trustworthy + global); only stored inquiries count.
const guard = createInquiryGuard();

export async function submitInquiryAction(_prev: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  if (!(formData instanceof FormData) || !isLocale(formData.get("lang"))) {
    return { status: "error", errors: {}, message: "invalid_submission" };
  }
  const ip = clientIp(await headers());
  if (!guard.allowed(ip)) return { status: "error", errors: {}, message: "too_many" };
  const res = submitInquiry(db, formData);
  if (!res.ok) return { status: "error", errors: res.errors, message: "check_fields" };
  guard.record(ip, res.bot === true); // honeypot hits consume the global quota silently
  return { status: "sent" };
}

export type { InquiryErrorCode };

import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { inquiries, inquiryStatuses, trips, type InquiryStatus } from "@/db/schema";
import { locales } from "@/i18n/config";
import { options, phoneSchema } from "./booking-input";

/** Stable validation codes; translated in the UI via `inquiry.errors[code]`. */
export const inquiryErrorCodes = [
  "required",
  "invalid_email",
  "invalid_phone",
  "invalid_date",
  "date_not_future",
  "duration_range",
  "group_range",
  "message_too_long",
  "consent_required",
  "trip_not_found",
  "invalid",
] as const;
export type InquiryErrorCode = (typeof inquiryErrorCodes)[number];

export const MESSAGE_MAX = 2000;
export const GROUP_MAX = 30;

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const inquiryInputSchema = z.object({
  lang: z.enum(locales),
  name: z.string().trim().min(2, { error: "required" }).max(120, { error: "invalid" }),
  email: z.email({ error: "invalid_email" }).max(200, { error: "invalid_email" }),
  phone: z.preprocess(blankToUndefined, phoneSchema.optional()).transform((v) => v ?? null),
  messenger: z.enum(options.messenger, { error: "required" }),
  tripId: z.preprocess(blankToUndefined, z.coerce.number({ error: "invalid" }).int({ error: "invalid" }).positive({ error: "invalid" }).optional()).transform((v) => v ?? null),
  preferredStart: z
    .preprocess(blankToUndefined, z.iso.date({ error: "invalid_date" }).optional())
    .transform((v) => v ?? null),
  durationDays: z
    .preprocess(blankToUndefined, z.coerce.number({ error: "duration_range" }).int({ error: "duration_range" }).min(2, { error: "duration_range" }).max(30, { error: "duration_range" }).optional())
    .transform((v) => v ?? null),
  groupSize: z.coerce.number({ error: "group_range" }).int({ error: "group_range" }).min(1, { error: "group_range" }).max(GROUP_MAX, { error: "group_range" }),
  message: z.string().trim().min(1, { error: "required" }).max(MESSAGE_MAX, { error: "message_too_long" }),
  consent: z.literal(true, { error: "consent_required" }),
});
export type InquiryInput = z.infer<typeof inquiryInputSchema>;
export type InquiryFieldErrors = Record<string, InquiryErrorCode>;

const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export function formDataToInquiryInput(fd: FormData): unknown {
  return {
    lang: text(fd, "lang"),
    name: text(fd, "name"),
    email: text(fd, "email"),
    phone: text(fd, "phone"),
    messenger: text(fd, "messenger"),
    tripId: text(fd, "tripId"),
    preferredStart: text(fd, "preferredStart"),
    durationDays: text(fd, "durationDays"),
    groupSize: text(fd, "groupSize"),
    message: text(fd, "message"),
    consent: fd.get("consent") === "on" || fd.get("consent") === "true",
  };
}

function toFieldErrors(error: z.ZodError): InquiryFieldErrors {
  const out: InquiryFieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (key in out) continue;
    out[key] = (inquiryErrorCodes as readonly string[]).includes(issue.message) ? (issue.message as InquiryErrorCode) : "invalid";
  }
  return out;
}

export type InquiryResult = { ok: true } | { ok: false; errors: InquiryFieldErrors };

/**
 * Validates and stores an inquiry. A filled honeypot (`website`) is a bot: report success, store nothing.
 * `now` is an ISO date (UTC) used for the "preferred start must be in the future" rule.
 */
export function submitInquiry(db: Db, fd: FormData, now = new Date().toISOString().slice(0, 10)): InquiryResult {
  if (text(fd, "website").trim() !== "") return { ok: true };
  const parsed = inquiryInputSchema.safeParse(formDataToInquiryInput(fd));
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error) };
  const { consent, ...input } = parsed.data;
  void consent;
  if (input.preferredStart && input.preferredStart <= now) return { ok: false, errors: { preferredStart: "date_not_future" } };
  if (input.tripId !== null && !db.select({ id: trips.id }).from(trips).where(eq(trips.id, input.tripId)).get()) {
    return { ok: false, errors: { tripId: "trip_not_found" } };
  }
  db.insert(inquiries).values(input).run();
  return { ok: true };
}

export function listInquiries(db: Db, status?: InquiryStatus) {
  return db
    .select({ inquiry: inquiries, tripSlug: trips.slug, tripTitle: trips.title })
    .from(inquiries)
    .leftJoin(trips, eq(trips.id, inquiries.tripId))
    .where(status ? eq(inquiries.status, status) : undefined)
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .all();
}

export function inquiryStatusCounts(db: Db): Record<InquiryStatus, number> {
  const rows = db.select({ status: inquiries.status, n: count() }).from(inquiries).groupBy(inquiries.status).all();
  const out: Record<InquiryStatus, number> = { new: 0, handled: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/** Idempotent; returns false when the inquiry does not exist or was already handled. */
export function markInquiryHandled(db: Db, id: number) {
  return db.update(inquiries).set({ status: "handled" }).where(and(eq(inquiries.id, id), eq(inquiries.status, "new"))).run().changes === 1;
}

export const parseInquiryStatus = (v: unknown): InquiryStatus | undefined => (inquiryStatuses as readonly unknown[]).includes(v) ? (v as InquiryStatus) : undefined;

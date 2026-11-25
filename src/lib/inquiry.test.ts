import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { inquiries, trips } from "@/db/schema";
import { inquiryStatusCounts, listInquiries, markInquiryHandled, submitInquiry } from "./inquiry";

const NOW = "2027-05-01";
const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
let db: Db;
let tripId: number;

const form = (over: Record<string, string> = {}) => {
  const fd = new FormData();
  const base: Record<string, string> = {
    lang: "en",
    name: "Anna Schmidt",
    email: "anna@example.com",
    phone: "",
    messenger: "email",
    tripId: "",
    preferredStart: "",
    durationDays: "",
    groupSize: "2",
    message: "We would like a private trip in September.",
    consent: "on",
    website: "",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) if (v !== "__omit__") fd.set(k, v);
  return fd;
};
const count = () => db.select().from(inquiries).all().length;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "drizzle" });
  tripId = db
    .insert(trips)
    .values({ slug: "t", title: l("T"), region: "multi", summary: l("s"), description: l("d"), durationDays: 7, pricePerPersonUsd: 500, difficulty: "easy", highlights: l([]), itinerary: l([]) })
    .returning()
    .get().id;
});

describe("submitInquiry", () => {
  it("stores a minimal valid inquiry with status new", () => {
    expect(submitInquiry(db, form(), NOW)).toEqual({ ok: true });
    const row = db.select().from(inquiries).get()!;
    expect(row).toMatchObject({ name: "Anna Schmidt", phone: null, tripId: null, preferredStart: null, durationDays: null, groupSize: 2, status: "new", lang: "en" });
  });

  it("stores the optional fields when given", () => {
    const res = submitInquiry(db, form({ phone: "+49 151 2345 6789", tripId: String(tripId), preferredStart: "2027-09-01", durationDays: "10" }), NOW);
    expect(res.ok).toBe(true);
    expect(db.select().from(inquiries).get()).toMatchObject({ phone: "+49 151 2345 6789", tripId, preferredStart: "2027-09-01", durationDays: 10 });
  });

  it("pretends success but stores nothing when the honeypot is filled", () => {
    expect(submitInquiry(db, form({ website: "http://spam.example" }), NOW)).toEqual({ ok: true, bot: true });
    expect(count()).toBe(0);
  });

  it("requires consent", () => {
    const res = submitInquiry(db, form({ consent: "__omit__" }), NOW);
    expect(res).toEqual({ ok: false, errors: { consent: "consent_required" } });
    expect(count()).toBe(0);
  });

  it.each([
    [{ name: "A" }, "name", "required"],
    [{ email: "nope" }, "email", "invalid_email"],
    [{ phone: "abc" }, "phone", "invalid_phone"],
    [{ messenger: "fax" }, "messenger", "required"],
    [{ groupSize: "0" }, "groupSize", "group_range"],
    [{ groupSize: "31" }, "groupSize", "group_range"],
    [{ groupSize: "" }, "groupSize", "group_range"],
    [{ durationDays: "1" }, "durationDays", "duration_range"],
    [{ durationDays: "31" }, "durationDays", "duration_range"],
    [{ preferredStart: "2027-02-30" }, "preferredStart", "invalid_date"],
    [{ preferredStart: "2027-05-01" }, "preferredStart", "date_not_future"],
    [{ preferredStart: "2020-01-01" }, "preferredStart", "date_not_future"],
    [{ message: "" }, "message", "required"],
    [{ message: "x".repeat(2001) }, "message", "message_too_long"],
    [{ lang: "de" }, "lang", "invalid"],
    [{ tripId: "99999" }, "tripId", "trip_not_found"],
    [{ tripId: "abc" }, "tripId", "invalid"],
  ] as const)("rejects %j with %s -> %s", (over, field, code) => {
    const res = submitInquiry(db, form(over as Record<string, string>), NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[field]).toBe(code);
    expect(count()).toBe(0);
  });

  it("accepts boundaries: 2000-char message, 30 travelers, 2 and 30 days", () => {
    expect(submitInquiry(db, form({ message: "x".repeat(2000), groupSize: "30", durationDays: "30" }), NOW).ok).toBe(true);
    expect(submitInquiry(db, form({ durationDays: "2", preferredStart: "2027-05-02" }), NOW).ok).toBe(true);
  });
});

describe("admin helpers", () => {
  it("lists newest first, filters by status and marks handled once", () => {
    submitInquiry(db, form({ name: "First One" }), NOW);
    submitInquiry(db, form({ name: "Second One" }), NOW);
    const all = listInquiries(db);
    expect(all.map((r) => r.inquiry.name)).toEqual(["Second One", "First One"]);
    expect(inquiryStatusCounts(db)).toEqual({ new: 2, handled: 0 });

    expect(markInquiryHandled(db, all[0].inquiry.id)).toBe(true);
    expect(markInquiryHandled(db, all[0].inquiry.id)).toBe(false);
    expect(markInquiryHandled(db, 9999)).toBe(false);
    expect(listInquiries(db, "new").map((r) => r.inquiry.name)).toEqual(["First One"]);
    expect(listInquiries(db, "handled").map((r) => r.inquiry.name)).toEqual(["Second One"]);
    expect(inquiryStatusCounts(db)).toEqual({ new: 1, handled: 1 });
  });
});

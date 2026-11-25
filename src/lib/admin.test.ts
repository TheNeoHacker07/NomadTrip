import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { bookings, departures, trips } from "@/db/schema";
import {
  addDeparture,
  bookingStatusCounts,
  createTrip,
  deleteDeparture,
  formDataToTripInput,
  getTripAdmin,
  listBookingsFiltered,
  parseBookingFilters,
  tripInputSchema,
  tripIssues,
  updateDepartureCapacity,
  updateTrip,
  type TripInput,
} from "./admin";

const NOW = "2027-05-01";
const l = (v: string) => ({ en: v, ru: v, ky: v });
const day = (n: number) => ({ title: l(`Day ${n}`), description: l("Ride"), overnight: l("Yurt camp") });
const tripInput = (over: Partial<TripInput> = {}, days = 3): TripInput => ({
  slug: "song-kol",
  pricePerPersonUsd: 450,
  difficulty: "easy",
  region: "naryn",
  title: l("Song-Kol"),
  summary: l("Lake trip"),
  description: l("Long description"),
  highlights: { en: ["Horses"], ru: ["Лошади"], ky: ["Жылкылар"] },
  itinerary: Array.from({ length: days }, (_, i) => day(i + 1)),
  ...over,
});

let db: Db;
beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "drizzle" });
});

const mkTrip = (slug = "song-kol") => {
  const r = createTrip(db, tripInput({ slug }));
  if (!r.ok) throw new Error("trip");
  return r.id;
};
const mkBooking = (departureId: number, travelerCount: number, status: "pending" | "confirmed" | "cancelled" = "pending", name = "Aida") =>
  db
    .insert(bookings)
    .values({
      reference: `NT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      departureId, status, travelerCount, totalPriceUsd: 100 * travelerCount,
      contactName: name, email: `${name.toLowerCase()}@example.com`, phone: "+996 555 100200", messenger: "email", country: "KG",
      yurtArrangement: "shared", fitnessLevel: "moderate", interests: [], arrivalAirport: "FRU", needsAirportPickup: false,
      emergencyName: "X", emergencyPhone: "1",
    })
    .run();

describe("trips", () => {
  it("derives durationDays from the itinerary and numbers the days per language", () => {
    const id = mkTrip();
    const { trip } = getTripAdmin(db, id)!;
    expect(trip.durationDays).toBe(3);
    expect(trip.itinerary.ru.map((d) => d.day)).toEqual([1, 2, 3]);
  });

  it("rejects duplicate slugs on create and on update, allows keeping own slug", () => {
    const a = mkTrip("a-trip");
    const b = mkTrip("b-trip");
    expect(createTrip(db, tripInput({ slug: "a-trip" }))).toEqual({ ok: false, error: "slug_taken" });
    expect(updateTrip(db, b, tripInput({ slug: "a-trip" }))).toEqual({ ok: false, error: "slug_taken" });
    expect(updateTrip(db, a, tripInput({ slug: "a-trip", pricePerPersonUsd: 999 }))).toEqual({ ok: true, id: a });
    expect(db.select().from(trips).all()).toHaveLength(2);
  });

  it("locks the duration while non-cancelled bookings exist, but allows price edits", () => {
    const id = mkTrip();
    const dep = db.insert(departures).values({ tripId: id, startDate: "2027-06-01", capacity: 10 }).returning().get();
    mkBooking(dep.id, 1, "cancelled");
    expect(updateTrip(db, id, tripInput({}, 4))).toEqual({ ok: true, id }); // only cancelled bookings
    mkBooking(dep.id, 1, "pending");
    expect(updateTrip(db, id, tripInput({}, 5))).toEqual({ ok: false, error: "duration_locked" });
    expect(getTripAdmin(db, id)!.trip.durationDays).toBe(4);
    expect(updateTrip(db, id, tripInput({ pricePerPersonUsd: 777 }, 4))).toEqual({ ok: true, id });
    expect(getTripAdmin(db, id)!.trip.pricePerPersonUsd).toBe(777);
  });

  it("labels itinerary issues by day, field and language", () => {
    const bad = { ...day(1), title: { ...l("x"), ky: "" }, description: { ...l("x"), ru: "" } };
    const r = tripInputSchema.safeParse(tripInput({ itinerary: [day(1), bad] }));
    if (r.success) throw new Error("expected failure");
    expect(tripIssues(r.error).fields).toEqual(expect.arrayContaining(["itinerary.2.title.ky", "itinerary.2.description.ru"]));
  });

  it("update returns not_found for an unknown id", () => {
    expect(updateTrip(db, 999, tripInput())).toEqual({ ok: false, error: "not_found" });
  });

  it("enforces duration 2-30 via itinerary length", () => {
    expect(tripInputSchema.safeParse(tripInput({}, 1)).success).toBe(false);
    expect(tripInputSchema.safeParse(tripInput({}, 2)).success).toBe(true);
    expect(tripInputSchema.safeParse(tripInput({}, 30)).success).toBe(true);
    const over = tripInputSchema.safeParse(tripInput({}, 31));
    expect(over.success).toBe(false);
    if (!over.success) expect(tripIssues(over.error).code).toBe("duration_range");
  });

  it("requires every localized field in all 3 languages", () => {
    for (const field of ["title", "summary", "description"] as const) {
      expect(tripInputSchema.safeParse(tripInput({ [field]: { ...l("x"), ky: "  " } })).success).toBe(false);
    }
    expect(tripInputSchema.safeParse(tripInput({ highlights: { en: ["a"], ru: ["b"], ky: [] } })).success).toBe(false);
    const badDay = { ...day(1), overnight: { ...l("x"), ru: "" } };
    expect(tripInputSchema.safeParse(tripInput({ itinerary: [badDay, day(2)] })).success).toBe(false);
  });

  it("validates slug format, price and region", () => {
    for (const slug of ["Upper", "has space", "-lead", "trail-", "a--b", ""]) {
      expect(tripInputSchema.safeParse(tripInput({ slug })).success).toBe(false);
    }
    expect(tripInputSchema.safeParse({ ...tripInput(), pricePerPersonUsd: "0" }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...tripInput(), pricePerPersonUsd: "12.5" }).success).toBe(false);
    expect(tripInputSchema.safeParse({ ...tripInput(), region: "mars" }).success).toBe(false);
  });

  it("parses flat form fields", () => {
    const fd = new FormData();
    fd.set("slug", "x-trip");
    fd.set("pricePerPersonUsd", "450");
    fd.set("difficulty", "easy");
    fd.set("region", "naryn");
    for (const lang of ["en", "ru", "ky"] as const) {
      fd.set(`title.${lang}`, "T");
      fd.set(`summary.${lang}`, "S");
      fd.set(`description.${lang}`, "D");
      fd.set(`highlights.${lang}`, "one\r\n\r\ntwo\n");
      for (const i of [0, 1]) for (const f of ["title", "description", "overnight"]) fd.set(`day.${i}.${f}.${lang}`, "v");
    }
    const parsed = tripInputSchema.parse(formDataToTripInput(fd));
    expect(parsed.itinerary).toHaveLength(2);
    expect(parsed.highlights.ky).toEqual(["one", "two"]);
  });
});

describe("departures", () => {
  it("adds only future departures with capacity 1-50", () => {
    const tripId = mkTrip();
    expect(addDeparture(db, { tripId, startDate: NOW, capacity: 8 }, NOW)).toEqual({ ok: false, error: "not_in_future" });
    expect(addDeparture(db, { tripId, startDate: "2027-06-01", capacity: 8 }, NOW)).toEqual({ ok: true });
    expect(() => addDeparture(db, { tripId, startDate: "2027-06-02", capacity: 0 }, NOW)).toThrow();
    expect(() => addDeparture(db, { tripId, startDate: "2027-06-02", capacity: 51 }, NOW)).toThrow();
    expect(() => addDeparture(db, { tripId, startDate: "2027-02-30", capacity: 5 }, NOW)).toThrow();
    expect(addDeparture(db, { tripId: 999, startDate: "2027-06-02", capacity: 5 }, NOW)).toEqual({ ok: false, error: "trip_not_found" });
  });

  it("refuses duplicate dates per trip and dates more than 3 years ahead", () => {
    const tripId = mkTrip();
    const other = mkTrip("other");
    expect(addDeparture(db, { tripId, startDate: "2027-06-01", capacity: 8 }, NOW)).toEqual({ ok: true });
    expect(addDeparture(db, { tripId, startDate: "2027-06-01", capacity: 5 }, NOW)).toEqual({ ok: false, error: "duplicate_date" });
    expect(addDeparture(db, { tripId: other, startDate: "2027-06-01", capacity: 5 }, NOW)).toEqual({ ok: true });
    expect(addDeparture(db, { tripId, startDate: "2030-05-01", capacity: 5 }, NOW)).toEqual({ ok: true });
    expect(addDeparture(db, { tripId, startDate: "2030-05-02", capacity: 5 }, NOW)).toEqual({ ok: false, error: "too_far" });
  });

  it("refuses capacity edits on departures starting today or earlier", () => {
    const tripId = mkTrip();
    const past = db.insert(departures).values({ tripId, startDate: "2027-04-01", capacity: 10 }).returning().get();
    const today = db.insert(departures).values({ tripId, startDate: NOW, capacity: 10 }).returning().get();
    const next = db.insert(departures).values({ tripId, startDate: "2027-05-02", capacity: 10 }).returning().get();
    expect(updateDepartureCapacity(db, { departureId: past.id, capacity: 5 }, NOW)).toEqual({ ok: false, error: "departure_past" });
    expect(updateDepartureCapacity(db, { departureId: today.id, capacity: 5 }, NOW)).toEqual({ ok: false, error: "departure_past" });
    expect(updateDepartureCapacity(db, { departureId: next.id, capacity: 5 }, NOW)).toEqual({ ok: true });
  });

  it("refuses capacity below seats taken, ignoring cancelled bookings", () => {
    const tripId = mkTrip();
    const dep = db.insert(departures).values({ tripId, startDate: "2027-06-01", capacity: 10 }).returning().get();
    mkBooking(dep.id, 3);
    mkBooking(dep.id, 2, "confirmed");
    mkBooking(dep.id, 4, "cancelled");
    expect(updateDepartureCapacity(db, { departureId: dep.id, capacity: 4 })).toEqual({ ok: false, error: "below_taken", taken: 5 });
    expect(getTripAdmin(db, tripId)!.departures[0].capacity).toBe(10);
    expect(updateDepartureCapacity(db, { departureId: dep.id, capacity: 5 })).toEqual({ ok: true });
    expect(getTripAdmin(db, tripId)!.departures[0]).toMatchObject({ capacity: 5, taken: 5 });
    expect(updateDepartureCapacity(db, { departureId: 999, capacity: 5 })).toEqual({ ok: false, error: "not_found" });
  });

  it("deletes a departure only when it has no bookings at all", () => {
    const tripId = mkTrip();
    const empty = db.insert(departures).values({ tripId, startDate: "2027-06-01", capacity: 10 }).returning().get();
    const booked = db.insert(departures).values({ tripId, startDate: "2027-07-01", capacity: 10 }).returning().get();
    const cancelledOnly = db.insert(departures).values({ tripId, startDate: "2027-08-01", capacity: 10 }).returning().get();
    mkBooking(booked.id, 1);
    mkBooking(cancelledOnly.id, 1, "cancelled");
    expect(deleteDeparture(db, { departureId: booked.id })).toEqual({ ok: false, error: "has_bookings" });
    expect(deleteDeparture(db, { departureId: cancelledOnly.id })).toEqual({ ok: false, error: "has_bookings" });
    expect(deleteDeparture(db, { departureId: empty.id })).toEqual({ ok: true });
    expect(getTripAdmin(db, tripId)!.departures.map((d) => d.id)).toEqual([booked.id, cancelledOnly.id]);
    expect(deleteDeparture(db, { departureId: empty.id })).toEqual({ ok: false, error: "not_found" });
  });
});

describe("booking filters", () => {
  it("filters by status, trip, date range and text, with counts", () => {
    const t1 = mkTrip("one");
    const t2 = mkTrip("two");
    const d1 = db.insert(departures).values({ tripId: t1, startDate: "2027-06-01", capacity: 10 }).returning().get();
    const d2 = db.insert(departures).values({ tripId: t2, startDate: "2027-09-01", capacity: 10 }).returning().get();
    mkBooking(d1.id, 1, "pending", "Aida");
    mkBooking(d1.id, 1, "confirmed", "Bakyt");
    mkBooking(d2.id, 1, "cancelled", "Chyngyz");
    const names = (f: Record<string, string>) => listBookingsFiltered(db, parseBookingFilters(f)).map((r) => r.booking.contactName).sort();

    expect(names({})).toEqual(["Aida", "Bakyt", "Chyngyz"]);
    expect(names({ status: "confirmed" })).toEqual(["Bakyt"]);
    expect(names({ trip: String(t2) })).toEqual(["Chyngyz"]);
    expect(names({ from: "2027-08-01" })).toEqual(["Chyngyz"]);
    expect(names({ to: "2027-06-30" })).toEqual(["Aida", "Bakyt"]);
    expect(names({ q: "BAKYT@exa" })).toEqual(["Bakyt"]);
    expect(names({ q: "555 100" })).toHaveLength(3);
    expect(names({ q: "aida@EXAMPLE" })).toEqual(["Aida"]);
    expect(names({ q: "%" })).toEqual([]); // LIKE wildcards are escaped
    const ref = listBookingsFiltered(db, {})[0].booking.reference;
    expect(names({ q: ref.toLowerCase() })).toHaveLength(1);
    expect(names({ status: "bogus", trip: "x", from: "nope" })).toHaveLength(3); // bad params are dropped
    expect(bookingStatusCounts(db, {})).toEqual({ pending: 1, confirmed: 1, cancelled: 1 });
    expect(bookingStatusCounts(db, { trip: t1, status: "pending" })).toEqual({ pending: 1, confirmed: 1, cancelled: 0 });
  });

  it("searches Cyrillic names case-insensitively", () => {
    const t = mkTrip();
    const d = db.insert(departures).values({ tripId: t, startDate: "2027-06-01", capacity: 10 }).returning().get();
    mkBooking(d.id, 1, "pending", "Айгуль Асанова");
    const names = (q: string) => listBookingsFiltered(db, { q }).map((r) => r.booking.contactName);
    expect(names("айгуль")).toEqual(["Айгуль Асанова"]);
    expect(names("АСАНОВА")).toEqual(["Айгуль Асанова"]);
    expect(names("zzz")).toEqual([]);
  });
});

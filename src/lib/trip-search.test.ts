import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { bookings, departures, trips, type TripRegion } from "@/db/schema";
import { parseTripFilters, searchTrips, type TripFilters } from "./trip-search";

const TODAY = "2027-05-01";
const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
let db: Db;

function addTrip(slug: string, region: TripRegion, durationDays: number, price: number, deps: [string, number][]) {
  const t = db
    .insert(trips)
    .values({
      slug,
      title: l(slug),
      region,
      summary: l(slug),
      description: l(slug),
      durationDays,
      pricePerPersonUsd: price,
      difficulty: "easy",
      highlights: l([]),
      itinerary: l([]),
    })
    .returning()
    .get();
  return deps.map(([startDate, capacity]) => db.insert(departures).values({ tripId: t.id, startDate, capacity }).returning().get().id);
}

function book(departureId: number, travelerCount: number, status: "pending" | "confirmed" | "cancelled" = "confirmed") {
  db.insert(bookings)
    .values({
      reference: `R${Math.random().toString(36).slice(2, 10)}`,
      departureId,
      status,
      travelerCount,
      totalPriceUsd: 1,
      contactName: "x",
      email: "x@example.com",
      phone: "1",
      messenger: "email",
      country: "DE",
      yurtArrangement: "shared",
      fitnessLevel: "low",
      interests: [],
      arrivalAirport: "FRU",
      needsAirportPickup: false,
      emergencyName: "y",
      emergencyPhone: "2",
    })
    .run();
}

const f = (over: Partial<TripFilters> = {}): TripFilters => ({ sort: "soonest", ...over });
const slugs = (filters: TripFilters) => searchTrips(db, filters, TODAY).map((t) => t.slug);

let soldOutDep: number;
let cancelledDep: number;
let weekendDep: number;

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "drizzle" });
  [weekendDep] = addTrip("weekend", "chui", 2, 150, [["2027-05-20", 4]]);
  addTrip("naryn-week", "naryn", 7, 500, [["2027-06-10", 6], ["2027-07-01", 6]]);
  [soldOutDep] = addTrip("naryn-ten", "naryn", 10, 800, [["2027-05-15", 2], ["2027-08-01", 5]]);
  [cancelledDep] = addTrip("lake-three", "issyk_kul", 3, 300, [["2027-05-10", 2]]);
  addTrip("grand", "multi", 30, 3400, [["2027-09-01", 8]]);
  addTrip("past-only", "osh", 5, 450, [["2027-04-01", 8], ["2027-05-01", 8]]); // not after today
  book(soldOutDep, 2); // naryn-ten May departure full
  book(cancelledDep, 2, "cancelled"); // frees its seats
});

describe("filters alone", () => {
  it("no filters returns every trip", () => {
    expect(slugs(f()).sort()).toEqual(["grand", "lake-three", "naryn-ten", "naryn-week", "past-only", "weekend"]);
  });
  it("region", () => expect(slugs(f({ region: "naryn" })).sort()).toEqual(["naryn-ten", "naryn-week"]));
  it.each([
    ["2-3", ["lake-three", "weekend"]],
    ["4-7", ["naryn-week", "past-only"]],
    ["8-14", ["naryn-ten"]],
    ["15-30", ["grand"]],
  ] as const)("duration %s", (duration, expected) => expect(slugs(f({ duration })).sort()).toEqual(expected));
  it("price min/max inclusive", () => {
    expect(slugs(f({ priceMin: 450, priceMax: 800 })).sort()).toEqual(["naryn-ten", "naryn-week", "past-only"]);
    expect(slugs(f({ priceMax: 150 }))).toEqual(["weekend"]);
    expect(slugs(f({ priceMin: 3400 }))).toEqual(["grand"]);
  });
  it("date range keeps trips with a future open departure inside it", () => {
    expect(slugs(f({ from: "2027-06-01", to: "2027-06-30" }))).toEqual(["naryn-week"]);
    expect(slugs(f({ to: "2027-05-12" }))).toEqual(["lake-three"]); // cancelled booking freed seats
    expect(slugs(f({ from: "2027-09-01" }))).toEqual(["grand"]);
  });
  it("range bounds are inclusive", () => {
    expect(slugs(f({ from: "2027-05-20", to: "2027-05-20" }))).toEqual(["weekend"]);
  });
  it("departures on or before today never count", () => {
    expect(slugs(f({ from: "2027-04-01", to: "2027-05-01" }))).toEqual([]);
  });
  it("sold-out departure is excluded from the date filter", () => {
    expect(slugs(f({ from: "2027-05-15", to: "2027-05-15" }))).toEqual([]);
    expect(slugs(f({ from: "2027-05-01", to: "2027-05-31" })).sort()).toEqual(["lake-three", "weekend"]);
  });
  it("partially booked departure with seats left still counts", () => {
    book(weekendDep, 3);
    expect(slugs(f({ from: "2027-05-20", to: "2027-05-20" }))).toEqual(["weekend"]);
    book(weekendDep, 1, "pending");
    expect(slugs(f({ from: "2027-05-20", to: "2027-05-20" }))).toEqual([]);
  });
});

describe("combinations", () => {
  it("AND together", () => {
    expect(slugs(f({ region: "naryn", duration: "8-14" }))).toEqual(["naryn-ten"]);
    expect(slugs(f({ region: "naryn", priceMax: 600 }))).toEqual(["naryn-week"]);
    expect(slugs(f({ region: "naryn", duration: "8-14", from: "2027-07-15", to: "2027-08-31" }))).toEqual(["naryn-ten"]);
    expect(slugs(f({ region: "naryn", duration: "8-14", from: "2027-05-01", to: "2027-06-30" }))).toEqual([]);
    expect(slugs(f({ region: "chui", priceMin: 200 }))).toEqual([]);
  });
});

describe("next departure", () => {
  it("is the earliest open future departure, skipping sold-out and past ones", () => {
    const by = Object.fromEntries(searchTrips(db, f(), TODAY).map((t) => [t.slug, t.nextDeparture]));
    expect(by["naryn-ten"]).toBe("2027-08-01");
    expect(by["naryn-week"]).toBe("2027-06-10");
    expect(by["lake-three"]).toBe("2027-05-10");
    expect(by["past-only"]).toBeNull();
  });
  it("respects the date range", () => {
    expect(searchTrips(db, f({ from: "2027-06-15" }), TODAY).find((t) => t.slug === "naryn-week")?.nextDeparture).toBe("2027-07-01");
  });
});

describe("sorting", () => {
  it("soonest departure, trips without open dates last", () => {
    expect(slugs(f())).toEqual(["lake-three", "weekend", "naryn-week", "naryn-ten", "grand", "past-only"]);
  });
  it("price ascending / descending", () => {
    expect(slugs(f({ sort: "price_asc" }))).toEqual(["weekend", "lake-three", "past-only", "naryn-week", "naryn-ten", "grand"]);
    expect(slugs(f({ sort: "price_desc" }))).toEqual(["grand", "naryn-ten", "naryn-week", "past-only", "lake-three", "weekend"]);
  });
  it("duration ascending", () => {
    expect(slugs(f({ sort: "duration" }))).toEqual(["weekend", "lake-three", "past-only", "naryn-week", "naryn-ten", "grand"]);
  });
});

describe("parseTripFilters", () => {
  it("parses valid values", () => {
    expect(
      parseTripFilters({ region: "naryn", duration: "8-14", priceMin: "100", priceMax: "500", from: "2027-06-01", to: "2027-06-30", sort: "price_desc" }),
    ).toEqual({ region: "naryn", duration: "8-14", priceMin: 100, priceMax: 500, from: "2027-06-01", to: "2027-06-30", sort: "price_desc" });
  });
  it("ignores invalid and unknown values", () => {
    expect(
      parseTripFilters({ region: "mars", duration: "999", priceMin: "abc", priceMax: "-5", from: "garbage", to: "2027-02-31", sort: "x", extra: "1" }),
    ).toEqual({ region: undefined, duration: undefined, priceMin: undefined, priceMax: undefined, from: undefined, to: undefined, sort: "soonest" });
  });
  it("ignores empty strings and uses the first of repeated params", () => {
    const r = parseTripFilters({ region: "", priceMax: ["300", "400"], duration: ["4-7", "2-3"] });
    expect(r.region).toBeUndefined();
    expect(r.priceMax).toBe(300);
    expect(r.duration).toBe("4-7");
  });
  it("swaps reversed ranges", () => {
    const r = parseTripFilters({ from: "2027-07-01", to: "2027-06-01", priceMin: "900", priceMax: "100" });
    expect([r.from, r.to, r.priceMin, r.priceMax]).toEqual(["2027-06-01", "2027-07-01", 100, 900]);
  });
  it("floors decimals and caps huge prices", () => {
    expect(parseTripFilters({ priceMax: "99.9" }).priceMax).toBe(99);
    expect(parseTripFilters({ priceMax: "99999999999999999999" }).priceMax).toBe(1_000_000);
  });
});

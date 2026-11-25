import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { bookings, departures, trips } from "@/db/schema";
import { groupByMonth, listUpcomingDepartures, monthsOf, parseMonth } from "./departures";

const TODAY = "2027-05-01";
const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
let db: Db;
let tripA: number;
let tripB: number;

const addTrip = (slug: string, durationDays: number) =>
  db
    .insert(trips)
    .values({ slug, title: l(slug), region: "multi", summary: l("s"), description: l("d"), durationDays, pricePerPersonUsd: 500, difficulty: "easy", highlights: l([]), itinerary: l([]) })
    .returning()
    .get().id;
const addDep = (tripId: number, startDate: string, capacity = 4) => db.insert(departures).values({ tripId, startDate, capacity }).returning().get().id;
let ref = 0;
const addBooking = (departureId: number, travelerCount: number, status: "pending" | "confirmed" | "cancelled") =>
  db.insert(bookings).values({
    reference: `NT-TEST${String(++ref).padStart(4, "0")}`, departureId, status, travelerCount, totalPriceUsd: 1, contactName: "x", email: "x@example.com", phone: "1",
    messenger: "email", country: "x", yurtArrangement: "shared", fitnessLevel: "low", interests: [], arrivalAirport: "FRU", needsAirportPickup: false, emergencyName: "x", emergencyPhone: "1",
  }).run();

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "drizzle" });
  tripA = addTrip("a", 3);
  tripB = addTrip("b", 7);
});

describe("listUpcomingDepartures", () => {
  it("lists only future departures across trips, ordered by date, with end date", () => {
    addDep(tripA, "2027-05-01"); // today: closed
    addDep(tripA, "2027-04-01"); // past
    addDep(tripB, "2027-07-10");
    addDep(tripA, "2027-06-05");
    const rows = listUpcomingDepartures(db, TODAY);
    expect(rows.map((r) => [r.startDate, r.trip.slug, r.endDate])).toEqual([
      ["2027-06-05", "a", "2027-06-07"],
      ["2027-07-10", "b", "2027-07-16"],
    ]);
  });

  it("computes seats left with the shared rule: cancelled bookings free their seats", () => {
    const d = addDep(tripA, "2027-06-05", 5);
    addBooking(d, 2, "confirmed");
    addBooking(d, 1, "pending");
    addBooking(d, 4, "cancelled");
    expect(listUpcomingDepartures(db, TODAY)[0].seatsLeft).toBe(2);
  });

  it("reports sold out as 0 seats left (never negative)", () => {
    const d = addDep(tripA, "2027-06-05", 2);
    addBooking(d, 2, "confirmed");
    expect(listUpcomingDepartures(db, TODAY)[0].seatsLeft).toBe(0);
  });

  it("filters by month", () => {
    addDep(tripA, "2027-06-05");
    addDep(tripB, "2027-07-10");
    expect(listUpcomingDepartures(db, TODAY, "2027-07").map((r) => r.startDate)).toEqual(["2027-07-10"]);
    expect(listUpcomingDepartures(db, TODAY, "2027-08")).toEqual([]);
  });
});

describe("groupByMonth / monthsOf", () => {
  it("groups consecutive rows by YYYY-MM", () => {
    addDep(tripA, "2027-06-05");
    addDep(tripB, "2027-06-20");
    addDep(tripA, "2027-08-01");
    const rows = listUpcomingDepartures(db, TODAY);
    expect(groupByMonth(rows).map((g) => [g.month, g.departures.length])).toEqual([["2027-06", 2], ["2027-08", 1]]);
    expect(monthsOf(rows)).toEqual(["2027-06", "2027-08"]);
  });
});

describe("parseMonth", () => {
  it("accepts YYYY-MM and ignores anything else", () => {
    expect(parseMonth("2027-06")).toBe("2027-06");
    expect(parseMonth(["2027-06", "x"])).toBe("2027-06");
    for (const bad of [undefined, "", "2027-13", "2027-00", "2027-6", "2027-06-01", "june", "'; drop"]) expect(parseMonth(bad)).toBeUndefined();
  });
});

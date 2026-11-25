import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { trips } from "@/db/schema";
import { detailRouteExists } from "./route-exists";

const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
const db = createDb(":memory:");
migrate(db, { migrationsFolder: "drizzle" });
db.insert(trips).values({ slug: "real", title: l("t"), region: "multi", summary: l("s"), description: l("d"), durationDays: 3, pricePerPersonUsd: 1, difficulty: "easy", highlights: l([]), itinerary: l([]) }).run();

describe("detailRouteExists", () => {
  it("checks trip slugs on the trip and booking pages", () => {
    expect(detailRouteExists(db, "/trips/real")).toBe(true);
    expect(detailRouteExists(db, "/trips/real/book")).toBe(true);
    expect(detailRouteExists(db, "/trips/nope")).toBe(false);
    expect(detailRouteExists(db, "/trips/nope/book")).toBe(false);
  });
  it("rejects malformed or unknown booking references", () => {
    expect(detailRouteExists(db, "/bookings/xx")).toBe(false);
    expect(detailRouteExists(db, "/bookings/NT-ABCDEFGH")).toBe(false);
  });
  it("leaves every other path alone", () => {
    for (const p of ["", "/trips", "/departures", "/admin", "/admin/trips/9", "/about"]) expect(detailRouteExists(db, p)).toBe(true);
  });
});

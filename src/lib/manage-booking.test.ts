import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { departures, trips } from "@/db/schema";
import type { BookingInput } from "./booking-input";
import { createBooking } from "./bookings";
import { lookupBooking, normalizeReference } from "./manage-booking";

const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
let db: Db;
let reference: string;

const input = (departureId: number): BookingInput => ({
  departureId,
  contactName: "Aida Test",
  email: "Aida.Test@Example.com",
  phone: "+49 170 1234567",
  messenger: "whatsapp",
  country: "Germany",
  travelers: [
    { fullName: "Aida Test", dateOfBirth: "1990-04-02", nationality: "German", diet: "none", allergies: "peanuts", ridingExperience: "none" },
    { fullName: "Max Test", dateOfBirth: "1988-01-02", nationality: "German", diet: "none", allergies: null, ridingExperience: "none" },
  ],
  yurtArrangement: "private",
  fitnessLevel: "moderate",
  interests: [],
  medicalNotes: "SECRET-MEDICAL",
  occasion: null,
  specialRequests: null,
  referralSource: null,
  arrivalAirport: "FRU",
  needsAirportPickup: true,
  arrivalFlight: "TK 345",
  emergencyName: "SECRET-EMERGENCY-NAME",
  emergencyPhone: "+49 170 7654321",
  consent: true,
});

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "drizzle" });
  const trip = db
    .insert(trips)
    .values({ slug: "t", title: l("T"), region: "multi", summary: l("s"), description: l("d"), durationDays: 7, pricePerPersonUsd: 500, difficulty: "easy", highlights: l([]), itinerary: l([]) })
    .returning()
    .get();
  const dep = db.insert(departures).values({ tripId: trip.id, startDate: "2099-06-01", capacity: 5 }).returning().get();
  const res = createBooking(db, input(dep.id), "2099-01-01");
  if (!res.ok) throw new Error("setup");
  reference = res.reference;
});

describe("normalizeReference", () => {
  it("normalises case, spaces and a missing hyphen", () => {
    expect(normalizeReference("  nt-abcd 2345 ")).toBe("NT-ABCD2345");
    expect(normalizeReference("ntabcd2345")).toBe("NT-ABCD2345");
  });
});

describe("lookupBooking", () => {
  it("returns the view for the right reference and email", () => {
    const v = lookupBooking(db, reference, "Aida.Test@Example.com");
    expect(v).toMatchObject({
      reference,
      status: "pending",
      startDate: "2099-06-01",
      durationDays: 7,
      travelerNames: ["Aida Test", "Max Test"],
      yurtArrangement: "private",
      pickup: { needed: true, airport: "FRU", flight: "TK 345" },
    });
    expect(v?.totalPriceUsd).toBeGreaterThan(0);
  });

  it("is case-insensitive for reference and email and tolerates spacing", () => {
    expect(lookupBooking(db, ` ${reference.toLowerCase()} `, "  AIDA.TEST@EXAMPLE.COM ")).not.toBeNull();
  });

  it("returns null for a wrong email, wrong reference, empty or malformed input", () => {
    expect(lookupBooking(db, reference, "other@example.com")).toBeNull();
    expect(lookupBooking(db, "NT-AAAAAAAA", "aida.test@example.com")).toBeNull();
    expect(lookupBooking(db, reference, "")).toBeNull();
    expect(lookupBooking(db, "", "aida.test@example.com")).toBeNull();
    expect(lookupBooking(db, "%", "aida.test@example.com")).toBeNull();
  });

  it("never exposes contact, health or emergency data", () => {
    const json = JSON.stringify(lookupBooking(db, reference, "aida.test@example.com"));
    for (const secret of ["SECRET-MEDICAL", "SECRET-EMERGENCY-NAME", "+49 170 7654321", "+49 170 1234567", "@example.com", "peanuts", "1990-04-02"]) {
      expect(json).not.toContain(secret);
    }
    const keys = Object.keys(lookupBooking(db, reference, "aida.test@example.com")!);
    expect(keys.sort()).toEqual(
      ["durationDays", "pickup", "reference", "startDate", "status", "totalPriceUsd", "travelerNames", "tripSlug", "tripTitle", "yurtArrangement"].sort(),
    );
  });
});

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { departures, trips } from "@/db/schema";
import { bookingInputSchema, formDataToBookingInput, type BookingInput } from "./booking-input";
import { createBooking, getBookingByReference, getTripWithDepartures, setBookingStatus } from "./bookings";
import { quote } from "./pricing";

const NOW = "2027-05-01";
let db: Db;
let departureId: number;

const traveler = (name = "Aida Test") => ({
  fullName: name,
  dateOfBirth: "1990-04-02",
  nationality: "German",
  diet: "vegetarian" as const,
  allergies: null,
  ridingExperience: "beginner" as const,
});

const input = (overrides: Partial<BookingInput> = {}): BookingInput => ({
  departureId,
  contactName: "Aida Test",
  email: "aida@example.com",
  phone: "+49 170 1234567",
  messenger: "whatsapp",
  country: "Germany",
  travelers: [traveler()],
  yurtArrangement: "shared",
  fitnessLevel: "moderate",
  interests: ["horse_riding"],
  medicalNotes: null,
  occasion: null,
  specialRequests: null,
  referralSource: null,
  arrivalAirport: "FRU",
  needsAirportPickup: true,
  arrivalFlight: "TK 345",
  emergencyName: "Max Test",
  emergencyPhone: "+49 170 7654321",
  consent: true,
  ...overrides,
});

beforeEach(() => {
  db = createDb(":memory:");
  migrate(db, { migrationsFolder: "drizzle" });
  const trip = db
    .insert(trips)
    .values({
      slug: "t", title: "T", region: "R", summary: "s", description: "d",
      durationDays: 7, pricePerPersonUsd: 500, difficulty: "easy", highlights: [], itinerary: [],
    })
    .returning()
    .get();
  departureId = db.insert(departures).values({ tripId: trip.id, startDate: "2027-06-01", capacity: 3 }).returning().get().id;
});

describe("createBooking", () => {
  it("stores booking, travelers and server-computed price", () => {
    const res = createBooking(db, input({ travelers: [traveler("A"), traveler("B")], yurtArrangement: "private" }), NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.reference).toMatch(/^NT-[A-Z2-9]{8}$/);
    const saved = getBookingByReference(db, res.reference)!;
    expect(saved.travelers.map((t) => t.fullName)).toEqual(["A", "B"]);
    // 2 × $500 + 1 private yurt × 6 nights × $30
    expect(saved.booking.totalPriceUsd).toBe(1180);
    expect(saved.booking.status).toBe("pending");
  });

  it("never oversells a departure", () => {
    expect(createBooking(db, input({ travelers: [traveler(), traveler()] }), NOW).ok).toBe(true);
    expect(createBooking(db, input({ travelers: [traveler(), traveler()] }), NOW)).toEqual({
      ok: false, error: "not_enough_seats", seatsLeft: 1,
    });
    expect(createBooking(db, input(), NOW).ok).toBe(true);
    expect(getTripWithDepartures(db, "t", NOW)!.departures[0].seatsLeft).toBe(0);
  });

  it("frees seats when a booking is cancelled, and cancelled is terminal", () => {
    const res = createBooking(db, input({ travelers: [traveler(), traveler(), traveler()] }), NOW);
    if (!res.ok) throw new Error("expected ok");
    const id = getBookingByReference(db, res.reference)!.booking.id;
    expect(setBookingStatus(db, id, "cancelled")).toBe(true);
    expect(setBookingStatus(db, id, "confirmed")).toBe(false);
    expect(getTripWithDepartures(db, "t", NOW)!.departures[0].seatsLeft).toBe(3);
  });

  it("rejects departed or unknown departures", () => {
    expect(createBooking(db, input(), "2027-06-01")).toEqual({ ok: false, error: "departure_closed" });
    expect(createBooking(db, input({ departureId: 999 }), NOW)).toEqual({ ok: false, error: "departure_not_found" });
  });
});

describe("booking form parsing", () => {
  const fd = (entries: [string, string][]) => {
    const f = new FormData();
    for (const [k, v] of entries) f.append(k, v);
    return f;
  };
  const base: [string, string][] = [
    ["departureId", "1"], ["contactName", "Aida"], ["email", "aida@example.com"], ["phone", "+996 555 123456"],
    ["messenger", "telegram"], ["country", "Kyrgyzstan"], ["yurtArrangement", "shared"], ["fitnessLevel", "high"],
    ["arrivalAirport", "OSS"], ["emergencyName", "Bek"], ["emergencyPhone", "+996 555 654321"],
    ["travelers.0.fullName", "Aida Test"], ["travelers.0.dateOfBirth", "1995-01-01"], ["travelers.0.nationality", "Kyrgyz"],
    ["travelers.0.diet", "halal"], ["travelers.0.ridingExperience", "confident"], ["travelers.0.allergies", ""],
    ["interests", "trekking"], ["interests", "cooking"], ["consent", "on"],
  ];

  it("parses a valid submission", () => {
    const parsed = bookingInputSchema.parse(formDataToBookingInput(fd(base)));
    expect(parsed.interests).toEqual(["trekking", "cooking"]);
    expect(parsed.travelers[0].allergies).toBeNull();
    expect(parsed.needsAirportPickup).toBe(false);
  });

  it("requires consent and rejects unknown option values", () => {
    const bad = base.filter(([k]) => k !== "consent").map(([k, v]): [string, string] => (k === "interests" ? [k, "bungee"] : [k, v]));
    const res = bookingInputSchema.safeParse(formDataToBookingInput(fd(bad)));
    expect(res.success).toBe(false);
    const paths = res.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("consent");
    expect(paths.some((p) => p.startsWith("interests"))).toBe(true);
  });
});

describe("quote", () => {
  it("charges one private yurt per 4 travelers per night", () => {
    expect(quote({ pricePerPersonUsd: 100, durationDays: 3, travelerCount: 5, yurtArrangement: "private" })).toMatchObject({
      base: 500, yurts: 2, nights: 2, yurtSupplement: 120, total: 620,
    });
  });
});

import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { departures, trips } from "@/db/schema";
import { createBooking } from "./bookings";

const run = promisify(execFile);
const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
const base = join(process.cwd(), "data", "race-tests"); // real disk inside the worktree, never /tmp
let dir: string;
let path: string;
let db: Db;
let departureId: number;

function seed(capacity: number) {
  const trip = db
    .insert(trips)
    .values({
      slug: `race-${capacity}-${Math.random().toString(36).slice(2, 8)}`,
      title: l("Race"),
      region: "chui",
      summary: l("s"),
      description: l("d"),
      durationDays: 2,
      pricePerPersonUsd: 100,
      difficulty: "easy",
      highlights: l([]),
      itinerary: l([]),
    })
    .returning()
    .get();
  return db.insert(departures).values({ tripId: trip.id, startDate: "2030-01-01", capacity }).returning().get().id;
}

beforeAll(() => {
  mkdirSync(base, { recursive: true });
  dir = mkdtempSync(join(base, "run-"));
  path = join(dir, "race.db");
  db = createDb(path);
  migrate(db, { migrationsFolder: "drizzle" });
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const taken = () =>
  (db.$client.prepare("select coalesce(sum(traveler_count),0) as n from bookings where departure_id = ? and status != 'cancelled'").get(departureId) as { n: number }).n;

async function bookInChild(seats: number, index: number) {
  const { stdout } = await run("npx", ["tsx", "src/lib/test-support/race-worker.ts", path, String(departureId), String(seats), String(index)]);
  return JSON.parse(stdout.trim().split("\n").pop()!) as { ok: boolean; error?: string; seatsLeft?: number };
}

describe("createBooking across separate connections to one database file", () => {
  it("two connections see each other's bookings (second one is refused)", () => {
    departureId = seed(3);
    const other = createDb(path);
    const input = (n: number) => ({
      departureId,
      contactName: "A B",
      email: "a@b.co",
      phone: "+49 170 1234567",
      messenger: "email" as const,
      country: "Germany",
      travelers: Array.from({ length: n }, (_, i) => ({
        fullName: `P ${i}`,
        dateOfBirth: "1990-01-01",
        nationality: "German",
        diet: "none" as const,
        allergies: null,
        ridingExperience: "none" as const,
      })),
      yurtArrangement: "shared" as const,
      fitnessLevel: "low" as const,
      interests: [],
      medicalNotes: null,
      occasion: null,
      specialRequests: null,
      referralSource: null,
      arrivalAirport: "FRU" as const,
      needsAirportPickup: false,
      arrivalFlight: null,
      emergencyName: "Em Er",
      emergencyPhone: "+49 170 7654321",
      consent: true as const,
    });
    expect(createBooking(db, input(2), "2020-01-01").ok).toBe(true);
    expect(createBooking(other, input(2), "2020-01-01")).toEqual({ ok: false, error: "not_enough_seats", seatsLeft: 1 });
    expect(createBooking(other, input(1), "2020-01-01").ok).toBe(true);
    expect(taken()).toBe(3);
  });

  it("six processes racing for 5 seats (2 each): exactly two win, never oversold", async () => {
    departureId = seed(5);
    const results = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => bookInChild(2, i)));
    const won = results.filter((r) => r.ok).length;
    expect(won).toBe(2);
    for (const r of results.filter((r) => !r.ok)) expect(r.error).toBe("not_enough_seats");
    expect(taken()).toBe(4);
  }, 60_000);

  it("racing for exactly the last seat: one winner", async () => {
    departureId = seed(1);
    const results = await Promise.all([0, 1, 2, 3].map((i) => bookInChild(1, i)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(taken()).toBe(1);
  }, 60_000);
});

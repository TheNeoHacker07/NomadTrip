import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import type { Locale } from "../src/i18n/config";

export { interpolate, plural } from "../src/i18n/format";

export const DB_PATH = "data/e2e.db";

/** Reads a dictionary namespace straight from the JSON files, so tests never hard-code translated text. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dict(lang: Locale, ns: string): any {
  return JSON.parse(readFileSync(join(process.cwd(), "src/i18n/dictionaries", lang, `${ns}.json`), "utf8"));
}

/** Runs `fn` with a short-lived connection to the e2e database (WAL, so it works while the server is running). */
export function withDb<T>(fn: (db: Database.Database) => T): T {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

export type TripRow = { id: number; slug: string; region: string; duration_days: number; price_per_person_usd: number };
export const allTrips = () => withDb((db) => db.prepare("select * from trips order by id").all() as TripRow[]);

/** Seats still free on a departure (capacity minus travelers of non-cancelled bookings). */
export function seatsLeft(departureId: number) {
  return withDb((db) => {
    const row = db
      .prepare(
        `select d.capacity - coalesce((select sum(traveler_count) from bookings b where b.departure_id = d.id and b.status != 'cancelled'), 0) as left
         from departures d where d.id = ?`,
      )
      .get(departureId) as { left: number };
    return row.left;
  });
}

/** Inserts a departure and returns its id. */
export function addDeparture(tripId: number, startDate: string, capacity: number) {
  return withDb((db) => Number(db.prepare("insert into departures (trip_id, start_date, capacity) values (?, ?, ?)").run(tripId, startDate, capacity).lastInsertRowid));
}

let refCounter = 0;
/** Direct booking insert (bypasses the UI) used to fill seats. */
export function insertBooking(opts: { departureId: number; travelers: number; status?: "pending" | "confirmed" | "cancelled"; name?: string }) {
  return withDb((db) => {
    const name = opts.name ?? "Seat Filler";
    const reference = `NT-${String(Date.now() % 1e6).padStart(6, "7")}${String(++refCounter).padStart(2, "7")}`.replace(/[01]/g, "7");
    const id = Number(
      db
        .prepare(
          `insert into bookings (reference, departure_id, status, traveler_count, total_price_usd, contact_name, email, phone, messenger, country,
             yurt_arrangement, fitness_level, interests, arrival_airport, needs_airport_pickup, emergency_name, emergency_phone)
           values (?, ?, ?, ?, 100, ?, 'fill@example.com', '+996555000111', 'email', 'Kyrgyzstan', 'shared', 'low', '[]', 'FRU', 0, 'Fill Contact', '+996555000222')`,
        )
        .run(reference, opts.departureId, opts.status ?? "confirmed", opts.travelers, name).lastInsertRowid,
    );
    const t = db.prepare("insert into travelers (booking_id, full_name, date_of_birth, nationality, diet, riding_experience) values (?, ?, '1990-01-01', 'Kyrgyz', 'none', 'none')");
    for (let i = 0; i < opts.travelers; i++) t.run(id, `${name} ${i + 1}`);
    return { id, reference };
  });
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** ISO date `daysAhead` days from today (UTC, like the server). */
export const futureDate = (daysAhead: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

type Who = { name: string; email: string; phone: string; travelers: { name: string; dob: string }[] };

/** Fills wizard step 1 (contact + travelers). */
export async function fillWho(page: Page, p: Who) {
  await page.locator('[name="contactName"]').fill(p.name);
  await page.locator('[name="phone"]').fill(p.phone);
  await page.locator('[name="email"]').fill(p.email);
  await page.locator('[name="country"]').fill("Germany");
  await page.locator('[name="travelerCount"]').selectOption(String(p.travelers.length));
  for (const [i, t] of p.travelers.entries()) {
    await page.locator(`[name="travelers.${i}.fullName"]`).fill(t.name);
    await page.locator(`[name="travelers.${i}.dateOfBirth"]`).fill(t.dob);
  }
}

/** Fills the required step-2 fields (nationality per traveler). */
export async function fillExperience(page: Page, count: number) {
  for (let i = 0; i < count; i++) await page.locator(`[name="travelers.${i}.nationality"]`).fill("German");
}

export type BookingData = {
  contact?: string;
  email?: string;
  phone?: string;
  travelers?: { name: string; dob: string }[];
  medicalNotes?: string;
  specialRequests?: string;
  emergencyName?: string;
  emergencyPhone?: string;
};

/** Walks the whole wizard for `bookUrl` up to (and including) the consent checkbox; the caller clicks submit. */
export async function fillWholeWizard(page: Page, lang: Locale, d: BookingData = {}) {
  const wizard = dict(lang, "booking").wizard;
  const travelers = d.travelers ?? [{ name: "Anna Schmidt", dob: "1990-05-15" }];
  const next = page.getByRole("button", { name: wizard.next });
  await fillWho(page, {
    name: d.contact ?? travelers[0].name,
    email: d.email ?? "anna.schmidt@example.com",
    phone: d.phone ?? "+49 151 2345 6789",
    travelers,
  });
  await next.click();
  await fillExperience(page, travelers.length);
  if (d.medicalNotes) await page.locator('[name="medicalNotes"]').fill(d.medicalNotes);
  await next.click();
  await page.locator('[name="emergencyName"]').fill(d.emergencyName ?? "Hans Schmidt");
  await page.locator('[name="emergencyPhone"]').fill(d.emergencyPhone ?? "+49 160 9876 5432");
  if (d.specialRequests) await page.locator('[name="specialRequests"]').fill(d.specialRequests);
  await page.locator('[name="consent"]').check();
}

/** First upcoming departure of a trip (id), straight from the database. */
export function firstDeparture(slug: string) {
  return withDb(
    (db) =>
      db
        .prepare("select d.id as id, d.start_date as startDate, d.capacity as capacity from departures d join trips t on t.id = d.trip_id where t.slug = ? and d.start_date > date('now') order by d.start_date limit 1")
        .get(slug) as { id: number; startDate: string; capacity: number },
  );
}

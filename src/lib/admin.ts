import { and, asc, desc, eq, gte, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { bookingStatuses, bookings, departures, travelers, trips, tripRegions, type BookingStatus } from "@/db/schema";
import { locales, type Locale } from "@/i18n/config";
import { today } from "./bookings";

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MIN_DAYS = 2;
export const MAX_DAYS = 30;
export const MAX_CAPACITY = 50;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s));

// ---------- Trip input ----------

const localizedText = (max: number) =>
  z.object(Object.fromEntries(locales.map((l) => [l, z.string().trim().min(1).max(max)])) as Record<Locale, z.ZodString>);
const localizedLines = z.object(
  Object.fromEntries(locales.map((l) => [l, z.array(z.string().trim().min(1).max(200)).min(1).max(20)])) as Record<
    Locale,
    z.ZodArray<z.ZodString>
  >,
);

export const itineraryDayInputSchema = z.object({
  title: localizedText(200),
  description: localizedText(2000),
  overnight: localizedText(200),
});

export const tripInputSchema = z.object({
  slug: z.string().trim().min(1).max(80).regex(SLUG_RE),
  pricePerPersonUsd: z.coerce.number().int().positive().max(1_000_000),
  difficulty: z.enum(["easy", "moderate", "challenging"]),
  region: z.enum(tripRegions),
  title: localizedText(200),
  summary: localizedText(500),
  description: localizedText(5000),
  highlights: localizedLines,
  // The message doubles as the error code: duration is always derived from this list's length.
  itinerary: z.array(itineraryDayInputSchema).min(MIN_DAYS, "duration_range").max(MAX_DAYS, "duration_range"),
});
export type TripInput = z.infer<typeof tripInputSchema>;

const byLocale = <T>(pick: (l: Locale) => T) => Object.fromEntries(locales.map((l) => [l, pick(l)])) as Record<Locale, T>;

function tripValues(input: TripInput) {
  return {
    slug: input.slug,
    title: input.title,
    region: input.region,
    summary: input.summary,
    description: input.description,
    durationDays: input.itinerary.length,
    pricePerPersonUsd: input.pricePerPersonUsd,
    difficulty: input.difficulty,
    highlights: input.highlights,
    itinerary: byLocale((l) =>
      input.itinerary.map((d, i) => ({ day: i + 1, title: d.title[l], description: d.description[l], overnight: d.overnight[l] })),
    ),
  };
}

export type TripResult = { ok: true; id: number } | { ok: false; error: "slug_taken" | "not_found" };

const slugTaken = (db: Pick<Db, "select">, slug: string, exceptId?: number) => {
  const row = db.select({ id: trips.id }).from(trips).where(eq(trips.slug, slug)).get();
  return !!row && row.id !== exceptId;
};
const isUniqueViolation = (e: unknown) => e instanceof Error && /UNIQUE constraint failed/.test(e.message);

export function createTrip(db: Db, input: TripInput): TripResult {
  const values = tripValues(tripInputSchema.parse(input));
  try {
    return db.transaction(
      (tx) => {
        if (slugTaken(tx, values.slug)) return { ok: false, error: "slug_taken" } as const;
        const row = tx.insert(trips).values(values).returning({ id: trips.id }).get();
        return { ok: true, id: row.id } as const;
      },
      { behavior: "immediate" },
    );
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "slug_taken" };
    throw e;
  }
}

export function updateTrip(db: Db, id: number, input: TripInput): TripResult {
  const values = tripValues(tripInputSchema.parse(input));
  try {
    return db.transaction(
      (tx) => {
        if (!tx.select({ id: trips.id }).from(trips).where(eq(trips.id, id)).get()) return { ok: false, error: "not_found" } as const;
        if (slugTaken(tx, values.slug, id)) return { ok: false, error: "slug_taken" } as const;
        tx.update(trips).set(values).where(eq(trips.id, id)).run();
        return { ok: true, id } as const;
      },
      { behavior: "immediate" },
    );
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "slug_taken" };
    throw e;
  }
}

// ---------- Departures ----------

const seatsTaken = sql<number>`coalesce((
  select sum(b.traveler_count) from bookings b
  where b.departure_id = "departures"."id" and b.status != 'cancelled'
), 0)`;
const bookingCount = sql<number>`(select count(*) from bookings b where b.departure_id = "departures"."id")`;

export const addDepartureSchema = z.object({
  tripId: z.coerce.number().int().positive(),
  startDate: isoDate,
  capacity: z.coerce.number().int().min(1).max(MAX_CAPACITY),
});
export const updateCapacitySchema = z.object({
  departureId: z.coerce.number().int().positive(),
  capacity: z.coerce.number().int().min(1).max(MAX_CAPACITY),
});
export const deleteDepartureSchema = z.object({ departureId: z.coerce.number().int().positive() });

export type DepartureResult =
  | { ok: true }
  | { ok: false; error: "trip_not_found" | "not_in_future" | "not_found" | "below_taken" | "has_bookings"; taken?: number };

export function addDeparture(db: Db, raw: z.input<typeof addDepartureSchema>, now = today()): DepartureResult {
  const input = addDepartureSchema.parse(raw);
  if (input.startDate <= now) return { ok: false, error: "not_in_future" };
  if (!db.select({ id: trips.id }).from(trips).where(eq(trips.id, input.tripId)).get()) return { ok: false, error: "trip_not_found" };
  db.insert(departures).values(input).run();
  return { ok: true };
}

/** Check and update share one IMMEDIATE transaction, so a concurrent booking can't slip between them. */
export function updateDepartureCapacity(db: Db, raw: z.input<typeof updateCapacitySchema>): DepartureResult {
  const { departureId, capacity } = updateCapacitySchema.parse(raw);
  return db.transaction(
    (tx) => {
      const row = tx.select({ id: departures.id, taken: seatsTaken }).from(departures).where(eq(departures.id, departureId)).get();
      if (!row) return { ok: false, error: "not_found" } as const;
      if (capacity < row.taken) return { ok: false, error: "below_taken", taken: row.taken } as const;
      tx.update(departures).set({ capacity }).where(eq(departures.id, departureId)).run();
      return { ok: true } as const;
    },
    { behavior: "immediate" },
  );
}

/** Only departures with no bookings at all (cancelled ones included, they are history) can go. */
export function deleteDeparture(db: Db, raw: z.input<typeof deleteDepartureSchema>): DepartureResult {
  const { departureId } = deleteDepartureSchema.parse(raw);
  return db.transaction(
    (tx) => {
      const row = tx.select({ id: departures.id, n: bookingCount }).from(departures).where(eq(departures.id, departureId)).get();
      if (!row) return { ok: false, error: "not_found" } as const;
      if (row.n > 0) return { ok: false, error: "has_bookings" } as const;
      tx.delete(departures).where(eq(departures.id, departureId)).run();
      return { ok: true } as const;
    },
    { behavior: "immediate" },
  );
}

// ---------- Queries ----------

export function listTripsAdmin(db: Db) {
  return db
    .select({
      trip: trips,
      departureCount: sql<number>`(select count(*) from departures d where d.trip_id = "trips"."id")`,
      bookingCount: sql<number>`(select count(*) from bookings b join departures d on d.id = b.departure_id where d.trip_id = "trips"."id")`,
    })
    .from(trips)
    .orderBy(asc(trips.id))
    .all();
}

export function getTripAdmin(db: Db, id: number) {
  const trip = db.select().from(trips).where(eq(trips.id, id)).get();
  if (!trip) return null;
  const deps = db
    .select({
      id: departures.id,
      startDate: departures.startDate,
      capacity: departures.capacity,
      taken: seatsTaken,
      bookingCount,
    })
    .from(departures)
    .where(eq(departures.tripId, id))
    .orderBy(asc(departures.startDate))
    .all();
  return { trip, departures: deps };
}

// ---------- Booking filters ----------

export const bookingFilterSchema = z.object({
  status: z.enum(bookingStatuses).optional().catch(undefined),
  trip: z.coerce.number().int().positive().optional().catch(undefined),
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
});
export type BookingFilters = z.infer<typeof bookingFilterSchema>;

/** Parses raw URL search params; invalid or empty values are dropped rather than failing the page. */
export function parseBookingFilters(raw: Record<string, string | string[] | undefined>): BookingFilters {
  const one = (k: string) => {
    const v = raw[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s === "" ? undefined : s;
  };
  return bookingFilterSchema.parse({ status: one("status"), trip: one("trip"), from: one("from"), to: one("to"), q: one("q") });
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function filterConditions(f: BookingFilters, withStatus: boolean): SQL[] {
  const c: SQL[] = [];
  if (withStatus && f.status) c.push(eq(bookings.status, f.status));
  if (f.trip) c.push(eq(departures.tripId, f.trip));
  if (f.from) c.push(gte(departures.startDate, f.from));
  if (f.to) c.push(lte(departures.startDate, f.to));
  if (f.q) {
    const p = `%${escapeLike(f.q.toLowerCase())}%`;
    const cols = [bookings.reference, bookings.contactName, bookings.email, bookings.phone];
    c.push(or(...cols.map((col) => sql`lower(${col}) like ${p} escape '\\'`))!);
  }
  return c;
}

export function listBookingsFiltered(db: Db, filters: BookingFilters) {
  const rows = db
    .select({ booking: bookings, departure: departures, trip: trips })
    .from(bookings)
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .innerJoin(trips, eq(trips.id, departures.tripId))
    .where(and(...filterConditions(filters, true)))
    .orderBy(desc(bookings.createdAt), desc(bookings.id))
    .all();
  const ids = rows.map((r) => r.booking.id);
  const people = ids.length ? db.select().from(travelers).where(inArray(travelers.bookingId, ids)).all() : [];
  return rows.map((r) => ({ ...r, travelers: people.filter((p) => p.bookingId === r.booking.id) }));
}

/** Counts per status under every filter except status itself, so the tabs show what each would return. */
export function bookingStatusCounts(db: Db, filters: BookingFilters): Record<BookingStatus, number> {
  const rows = db
    .select({ status: bookings.status, n: sql<number>`count(*)` })
    .from(bookings)
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .where(and(...filterConditions(filters, false)))
    .groupBy(bookings.status)
    .all();
  const out: Record<BookingStatus, number> = { pending: 0, confirmed: 0, cancelled: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

// ---------- FormData parsing ----------

const fieldText = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

/** Flat form fields (`title.en`, `highlights.ru` one per line, `day.<i>.title.ky`, …) into the shape tripInputSchema expects. */
export function formDataToTripInput(fd: FormData) {
  const loc = (name: string) => byLocale((l) => fieldText(fd, `${name}.${l}`));
  const dayIndexes = new Set<number>();
  for (const key of fd.keys()) {
    const m = /^day\.(\d+)\./.exec(key);
    if (m) dayIndexes.add(Number(m[1]));
  }
  return {
    slug: fieldText(fd, "slug"),
    pricePerPersonUsd: fieldText(fd, "pricePerPersonUsd"),
    difficulty: fieldText(fd, "difficulty"),
    region: fieldText(fd, "region"),
    title: loc("title"),
    summary: loc("summary"),
    description: loc("description"),
    highlights: byLocale((l) =>
      fieldText(fd, `highlights.${l}`)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
    itinerary: [...dayIndexes]
      .sort((a, b) => a - b)
      .map((i) => ({
        title: byLocale((l) => fieldText(fd, `day.${i}.title.${l}`)),
        description: byLocale((l) => fieldText(fd, `day.${i}.description.${l}`)),
        overnight: byLocale((l) => fieldText(fd, `day.${i}.overnight.${l}`)),
      })),
  };
}

/** Turns a Zod failure into a code (`duration_range`) or the list of offending fields for display. */
export function tripIssues(error: z.ZodError): { code: "duration_range" | "invalid"; fields: string[] } {
  if (error.issues.some((i) => i.message === "duration_range")) return { code: "duration_range", fields: [] };
  const fields = new Set<string>();
  for (const i of error.issues) {
    const [root, ...rest] = i.path;
    if (root === "itinerary") fields.add(`itinerary.${(rest[0] as number) + 1}.${String(rest[1])}.${String(rest[2] ?? "")}`);
    else fields.add([root, rest[0]].filter((x) => x !== undefined).join("."));
  }
  return { code: "invalid", fields: [...fields] };
}

import { randomInt } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { bookings, departures, travelers, trips, type BookingStatus } from "@/db/schema";
import type { BookingInput } from "./booking-input";
import { quote } from "./pricing";

// Fully qualified on purpose: Drizzle renders bare column names when a query has no join,
// which inside this correlated subquery would bind to bookings.id instead of departures.id.
const seatsTakenSql = sql<number>`coalesce((
  select sum(b.traveler_count) from bookings b
  where b.departure_id = "departures"."id" and b.status != 'cancelled'
), 0)`;

export const today = () => new Date().toISOString().slice(0, 10);

export function listTrips(db: Db) {
  return db.select().from(trips).orderBy(asc(trips.durationDays)).all();
}

export function getTripWithDepartures(db: Db, slug: string, onOrAfter = today()) {
  const trip = db.select().from(trips).where(eq(trips.slug, slug)).get();
  if (!trip) return null;
  const rows = db
    .select({ id: departures.id, startDate: departures.startDate, capacity: departures.capacity, taken: seatsTakenSql })
    .from(departures)
    .where(and(eq(departures.tripId, trip.id), gt(departures.startDate, onOrAfter)))
    .orderBy(asc(departures.startDate))
    .all();
  return { trip, departures: rows.map((d) => ({ ...d, seatsLeft: Math.max(0, d.capacity - d.taken) })) };
}

export function getDeparture(db: Db, departureId: number) {
  const row = db
    .select({ departure: departures, trip: trips, taken: seatsTakenSql })
    .from(departures)
    .innerJoin(trips, eq(trips.id, departures.tripId))
    .where(eq(departures.id, departureId))
    .get();
  return row ? { ...row, seatsLeft: Math.max(0, row.departure.capacity - row.taken) } : null;
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "NT-" + Array.from({ length: 8 }, () => REF_ALPHABET[randomInt(REF_ALPHABET.length)]).join("");

export type CreateBookingResult =
  | { ok: true; reference: string }
  | { ok: false; error: "departure_not_found" | "departure_closed" | "not_enough_seats"; seatsLeft?: number };

/**
 * Creates a booking atomically. The IMMEDIATE transaction takes SQLite's write lock before
 * counting seats, so two concurrent bookings can never oversell a departure.
 */
export function createBooking(db: Db, input: BookingInput, now = today()): CreateBookingResult {
  return db.transaction(
    (tx) => {
      const row = tx
        .select({ departure: departures, trip: trips, taken: seatsTakenSql })
        .from(departures)
        .innerJoin(trips, eq(trips.id, departures.tripId))
        .where(eq(departures.id, input.departureId))
        .get();
      if (!row) return { ok: false, error: "departure_not_found" } as const;
      if (row.departure.startDate <= now) return { ok: false, error: "departure_closed" } as const;

      const seatsLeft = row.departure.capacity - row.taken;
      const travelerCount = input.travelers.length;
      if (travelerCount > seatsLeft) return { ok: false, error: "not_enough_seats", seatsLeft: Math.max(0, seatsLeft) } as const;

      let reference = newReference();
      while (tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.reference, reference)).get()) {
        reference = newReference();
      }

      const { total } = quote({
        pricePerPersonUsd: row.trip.pricePerPersonUsd,
        durationDays: row.trip.durationDays,
        travelerCount,
        yurtArrangement: input.yurtArrangement,
      });

      const { travelers: people, consent, ...rest } = input;
      if (!consent) throw new Error("Booking requires consent");
      const booking = tx
        .insert(bookings)
        .values({ ...rest, reference, travelerCount, totalPriceUsd: total })
        .returning({ id: bookings.id })
        .get();
      tx.insert(travelers).values(people.map((p) => ({ ...p, bookingId: booking.id }))).run();
      return { ok: true, reference } as const;
    },
    { behavior: "immediate" },
  );
}

export function getBookingByReference(db: Db, reference: string) {
  const row = db
    .select({ booking: bookings, departure: departures, trip: trips })
    .from(bookings)
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .innerJoin(trips, eq(trips.id, departures.tripId))
    .where(eq(bookings.reference, reference))
    .get();
  if (!row) return null;
  const people = db.select().from(travelers).where(eq(travelers.bookingId, row.booking.id)).all();
  return { ...row, travelers: people };
}

export function listBookings(db: Db) {
  const rows = db
    .select({ booking: bookings, departure: departures, trip: trips })
    .from(bookings)
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .innerJoin(trips, eq(trips.id, departures.tripId))
    .orderBy(desc(bookings.createdAt), desc(bookings.id))
    .all();
  const ids = rows.map((r) => r.booking.id);
  const people = ids.length ? db.select().from(travelers).where(inArray(travelers.bookingId, ids)).all() : [];
  return rows.map((r) => ({ ...r, travelers: people.filter((p) => p.bookingId === r.booking.id) }));
}

const allowedFrom: Record<Exclude<BookingStatus, "pending">, BookingStatus[]> = {
  confirmed: ["pending"],
  cancelled: ["pending", "confirmed"], // cancelled is terminal, so its seats never need re-checking
};

/** Returns false when the transition is not allowed from the booking's current status. */
export function setBookingStatus(db: Db, bookingId: number, status: "confirmed" | "cancelled") {
  const res = db
    .update(bookings)
    .set({ status })
    .where(and(eq(bookings.id, bookingId), inArray(bookings.status, allowedFrom[status]), ne(bookings.status, status)))
    .run();
  return res.changes === 1;
}

import { asc, eq, gt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { departures, trips } from "@/db/schema";
import { seatsTakenFor } from "./bookings";
import { addDays } from "./pricing";

export type DepartureRow = {
  id: number;
  startDate: string;
  endDate: string;
  capacity: number;
  seatsLeft: number;
  trip: typeof trips.$inferSelect;
};

export type DepartureMonth = { month: string; departures: DepartureRow[] };

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `YYYY-MM` or undefined; anything else (including arrays and empty strings) is ignored. */
export function parseMonth(raw: string | string[] | undefined): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && MONTH_RE.test(v) ? v : undefined;
}

/** Every departure starting after `today` across all trips, in one query. Seats use the shared `seatsTakenFor` rule. */
export function listUpcomingDepartures(db: Db, today: string, month?: string): DepartureRow[] {
  const taken = seatsTakenFor(sql.raw(`"departures"."id"`));
  const rows = db
    .select({ id: departures.id, startDate: departures.startDate, capacity: departures.capacity, taken, trip: trips })
    .from(departures)
    .innerJoin(trips, eq(trips.id, departures.tripId))
    .where(gt(departures.startDate, today))
    .orderBy(asc(departures.startDate), asc(departures.id))
    .all();
  return rows
    .filter((r) => !month || r.startDate.startsWith(`${month}-`))
    .map((r) => ({
      id: r.id,
      startDate: r.startDate,
      endDate: addDays(r.startDate, r.trip.durationDays - 1),
      capacity: r.capacity,
      seatsLeft: Math.max(0, r.capacity - r.taken),
      trip: r.trip,
    }));
}

/** Months (YYYY-MM) that have at least one upcoming departure, ascending. */
export function monthsOf(rows: DepartureRow[]): string[] {
  return [...new Set(rows.map((r) => r.startDate.slice(0, 7)))];
}

export function groupByMonth(rows: DepartureRow[]): DepartureMonth[] {
  const out: DepartureMonth[] = [];
  for (const r of rows) {
    const month = r.startDate.slice(0, 7);
    const last = out[out.length - 1];
    if (last?.month === month) last.departures.push(r);
    else out.push({ month, departures: [r] });
  }
  return out;
}

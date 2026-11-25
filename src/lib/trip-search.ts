import { and, asc, desc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { tripRegions, trips, type TripRegion } from "@/db/schema";
import { seatsTakenFor } from "./bookings";

export const durationBuckets = ["2-3", "4-7", "8-14", "15-30"] as const;
export type DurationBucket = (typeof durationBuckets)[number];
export const tripSorts = ["soonest", "price_asc", "price_desc", "duration"] as const;
export type TripSort = (typeof tripSorts)[number];

const bucketRange: Record<DurationBucket, [number, number]> = {
  "2-3": [2, 3],
  "4-7": [4, 7],
  "8-14": [8, 14],
  "15-30": [15, 30],
};

export type TripFilters = {
  region?: TripRegion;
  duration?: DurationBucket;
  priceMin?: number;
  priceMax?: number;
  /** Inclusive YYYY-MM-DD bounds for a departure start date. */
  from?: string;
  to?: string;
  sort: TripSort;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const MAX_PRICE = 1_000_000;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  });
const price = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/)
  .transform((s) => Math.min(MAX_PRICE, Math.floor(Number(s))));

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
/** Parses one param; anything invalid (or empty) becomes undefined. */
function pick<T>(schema: z.ZodType<T>, raw: string | string[] | undefined): T | undefined {
  const r = schema.safeParse(first(raw));
  return r.success ? r.data : undefined;
}

/** Never throws: invalid or unknown values are dropped. */
export function parseTripFilters(params: SearchParams): TripFilters {
  let priceMin = pick(price, params.priceMin);
  let priceMax = pick(price, params.priceMax);
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];
  let from = pick(isoDate, params.from);
  let to = pick(isoDate, params.to);
  if (from && to && from > to) [from, to] = [to, from];
  return {
    region: pick(z.enum(tripRegions), params.region),
    duration: pick(z.enum(durationBuckets), params.duration),
    priceMin,
    priceMax,
    from,
    to,
    sort: pick(z.enum(tripSorts), params.sort) ?? "soonest",
  };
}

export function hasActiveFilters(f: TripFilters) {
  return Boolean(f.region || f.duration || f.priceMin !== undefined || f.priceMax !== undefined || f.from || f.to);
}

/**
 * Earliest departure after `today` (and inside the optional date range) that still has a free seat.
 * Fully qualified column names: the subquery is correlated with the outer "trips" row. Seats use the shared
 * `seatsTakenFor` rule from bookings.ts.
 */
function nextOpenDepartureSql(f: TripFilters, today: string) {
  const lower = f.from && f.from > today ? f.from : null;
  return sql<string | null>`(
    select min(d.start_date) from departures d
    where d.trip_id = "trips"."id"
      and d.start_date > ${today}
      ${lower ? sql`and d.start_date >= ${lower}` : sql``}
      ${f.to ? sql`and d.start_date <= ${f.to}` : sql``}
      and d.capacity > ${seatsTakenFor(sql.raw("d.id"))}
  )`;
}

export function searchTrips(db: Db, filters: TripFilters, today: string) {
  const nextDeparture = nextOpenDepartureSql(filters, today);
  const where: (SQL | undefined)[] = [];
  if (filters.region) where.push(eq(trips.region, filters.region));
  if (filters.duration) {
    const [lo, hi] = bucketRange[filters.duration];
    where.push(gte(trips.durationDays, lo), lte(trips.durationDays, hi));
  }
  if (filters.priceMin !== undefined) where.push(gte(trips.pricePerPersonUsd, filters.priceMin));
  if (filters.priceMax !== undefined) where.push(lte(trips.pricePerPersonUsd, filters.priceMax));
  if (filters.from || filters.to) where.push(isNotNull(nextDeparture));

  const order = {
    // Trips with no open date sort last (NULL flag), then by date. With a date range, the date shown is the first match in it.
    soonest: [asc(sql`${nextDeparture} is null`), asc(nextDeparture), asc(trips.durationDays)],
    price_asc: [asc(trips.pricePerPersonUsd), asc(trips.durationDays)],
    price_desc: [desc(trips.pricePerPersonUsd), asc(trips.durationDays)],
    duration: [asc(trips.durationDays), asc(trips.pricePerPersonUsd)],
  }[filters.sort];

  return db
    .select({ trip: trips, nextDeparture: nextDeparture })
    .from(trips)
    .where(and(...where))
    .orderBy(...order, asc(trips.id))
    .all()
    .map((r) => ({ ...r.trip, nextDeparture: r.nextDeparture }));
}

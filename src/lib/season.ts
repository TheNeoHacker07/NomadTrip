import { addDays } from "./pricing";

/** High-altitude yurt camps operate in summer only (see the FAQ: June–September). */
export const SEASON = { firstStart: "06-07", lastEnd: "09-30" } as const;
const START_DAYS = ["06-07", "06-21", "07-05", "07-19", "08-02", "08-16", "08-30"];

/**
 * Sample departure dates for the next summer season that is still at least two weeks away,
 * keeping only starts whose last trip day falls on or before 30 September.
 */
export function seasonDepartures(today: string, durationDays: number): string[] {
  const year = Number(today.slice(0, 4));
  const season = addDays(today, 14) <= `${year}-${SEASON.firstStart}` ? year : year + 1;
  return START_DAYS.map((md) => `${season}-${md}`).filter(
    (start) => addDays(start, durationDays - 1) <= `${season}-${SEASON.lastEnd}`,
  );
}

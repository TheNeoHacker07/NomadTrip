import type { TripRegion } from "@/db/schema";

export type SimilarCandidate = { id: number; region: TripRegion; durationDays: number; pricePerPersonUsd: number };

/** Up to `limit` other trips: same region first, then closest duration, then closest price, then id for stability. */
export function rankSimilar<T extends SimilarCandidate>(current: SimilarCandidate, all: T[], limit = 3): T[] {
  return all
    .filter((t) => t.id !== current.id)
    .sort(
      (a, b) =>
        Number(b.region === current.region) - Number(a.region === current.region) ||
        Math.abs(a.durationDays - current.durationDays) - Math.abs(b.durationDays - current.durationDays) ||
        Math.abs(a.pricePerPersonUsd - current.pricePerPersonUsd) - Math.abs(b.pricePerPersonUsd - current.pricePerPersonUsd) ||
        a.id - b.id,
    )
    .slice(0, limit);
}

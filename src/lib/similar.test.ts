import { describe, expect, it } from "vitest";
import type { TripRegion } from "@/db/schema";
import { rankSimilar, type SimilarCandidate } from "./similar";

const t = (id: number, region: TripRegion, durationDays: number, pricePerPersonUsd: number): SimilarCandidate => ({ id, region, durationDays, pricePerPersonUsd });
const cur = t(1, "naryn", 5, 800);

describe("rankSimilar", () => {
  it("excludes the current trip and caps at 3", () => {
    const out = rankSimilar(cur, [cur, t(2, "naryn", 5, 800), t(3, "osh", 5, 800), t(4, "osh", 6, 800), t(5, "osh", 7, 800)]);
    expect(out).toHaveLength(3);
    expect(out.map((x) => x.id)).not.toContain(1);
  });
  it("same region first, then closest duration, then closest price", () => {
    const out = rankSimilar(cur, [t(2, "osh", 5, 800), t(3, "naryn", 12, 3000), t(4, "naryn", 6, 2000), t(5, "naryn", 6, 900), t(6, "naryn", 4, 800)], 5);
    expect(out.map((x) => x.id)).toEqual([6, 5, 4, 3, 2]);
  });
  it("returns fewer when there are fewer candidates, none when alone", () => {
    expect(rankSimilar(cur, [cur, t(2, "osh", 5, 800)])).toHaveLength(1);
    expect(rankSimilar(cur, [cur])).toEqual([]);
  });
  it("is deterministic on full ties (by id)", () => {
    expect(rankSimilar(cur, [t(9, "osh", 5, 800), t(7, "osh", 5, 800)]).map((x) => x.id)).toEqual([7, 9]);
  });
});

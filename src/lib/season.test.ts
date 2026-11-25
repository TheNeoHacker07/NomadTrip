import { describe, expect, it } from "vitest";
import { addDays } from "./pricing";
import { seasonDepartures } from "./season";

describe("seasonDepartures", () => {
  it("uses next year's summer when this season is underway or too close", () => {
    expect(seasonDepartures("2026-11-25", 2)[0]).toBe("2027-06-07");
    expect(seasonDepartures("2027-05-30", 2)[0]).toBe("2028-06-07");
  });

  it("uses this year's summer when it is still at least two weeks away", () => {
    expect(seasonDepartures("2027-03-01", 7)[0]).toBe("2027-06-07");
  });

  it("keeps every trip inside June–September, including 30-day journeys", () => {
    for (const days of [2, 7, 14, 30]) {
      const starts = seasonDepartures("2026-11-25", days);
      expect(starts.length).toBeGreaterThan(0);
      for (const s of starts) {
        expect(s >= "2027-06-07").toBe(true);
        expect(addDays(s, days - 1) <= "2027-09-30").toBe(true);
      }
    }
  });
});

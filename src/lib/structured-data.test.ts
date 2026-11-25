import { describe, expect, it } from "vitest";
import type { Trip } from "@/db/schema";
import { buildTripJsonLd, jsonLdString } from "./structured-data";

const l = <T>(v: T) => ({ en: v, ru: v, ky: v });
const trip: Trip = {
  id: 1, slug: "x-trip", title: l("X </script><b>"), region: "naryn", summary: l("s"), description: l("Desc"), durationDays: 2, pricePerPersonUsd: 450, difficulty: "easy",
  highlights: l(["Horses", "Yurts"]),
  itinerary: l([{ day: 1, title: "Arrive", description: "d1", overnight: "Camp" }, { day: 2, title: "Ride", description: "d2", overnight: "Camp" }]),
};
const ld = buildTripJsonLd({ trip, lang: "en", origin: "https://ex.com", imageUrl: "https://ex.com/i.jpg", offers: [{ id: 5, startDate: "2027-06-01", seatsLeft: 2 }, { id: 6, startDate: "2027-07-01", seatsLeft: 0 }] });

describe("buildTripJsonLd", () => {
  it("builds a TouristTrip with itinerary list and USD offers per departure", () => {
    expect(ld["@type"]).toBe("TouristTrip");
    expect(ld.touristType).toBe("Horses, Yurts");
    expect(ld.itinerary.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(ld.offers.map((o) => [o.priceCurrency, o.price, o.availability, o.validFrom])).toEqual([
      ["USD", 450, "https://schema.org/InStock", "2027-06-01"],
      ["USD", 450, "https://schema.org/SoldOut", "2027-07-01"],
    ]);
    expect(ld.offers[0].url).toBe("https://ex.com/en/trips/x-trip/book?departure=5");
  });
  it("has no offers when there are no departures", () => {
    expect(buildTripJsonLd({ trip, lang: "ru", origin: "https://ex.com", imageUrl: "i", offers: [] }).offers).toEqual([]);
  });
});

describe("jsonLdString", () => {
  it("never emits a raw '<' and round-trips through JSON.parse", () => {
    const s = jsonLdString(ld);
    expect(s).not.toContain("<");
    expect(JSON.parse(s).name).toBe("X </script><b>");
  });
});

import { describe, expect, it } from "vitest";
import { locales } from "@/i18n/config";
import { buildSitemapEntries } from "./sitemap-entries";

const entries = buildSitemapEntries("https://ex.com", ["song-kul-weekend"]);
const urls = entries.map((e) => e.url);

describe("buildSitemapEntries", () => {
  it("has every locale for home, trips, departures, info pages and each trip", () => {
    for (const l of locales)
      for (const p of ["", "/trips", "/departures", "/about", "/yurt-life", "/faq", "/whats-included", "/experiences", "/photo-credits", "/inquiry", "/manage-booking", "/trips/song-kul-weekend"])
        expect(urls).toContain(`https://ex.com/${l}${p}`);
  });
  it("never lists admin or booking-confirmation URLs", () => {
    expect(urls.filter((u) => /\/admin|\/bookings\//.test(u))).toEqual([]);
  });
  it("carries hreflang alternates including x-default", () => {
    const home = entries.find((e) => e.url === "https://ex.com/ru")!;
    expect(home.alternates?.languages).toMatchObject({ en: "https://ex.com/en", ru: "https://ex.com/ru", ky: "https://ex.com/ky", "x-default": "https://ex.com/en" });
  });
});

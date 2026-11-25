import { describe, expect, it } from "vitest";
import { tripRegions } from "@/db/schema";
import { locales } from "@/i18n/config";
import { images, regionCover, tripCover } from "./images";

const allowed = /^(CC0|Public domain|CC BY(-SA)? \d\.\d)$/;

describe("image manifest", () => {
  it("has attribution, an allowed license and alt text in every locale for each photo", () => {
    for (const [key, img] of Object.entries(images)) {
      expect(img.src, key).toBe(`/images/${key}.jpg`);
      expect(img.author.trim(), key).not.toBe("");
      expect(img.license, key).toMatch(allowed);
      expect(img.sourceUrl, key).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      if (img.license !== "Public domain") expect(img.licenseUrl, key).toMatch(/^https:\/\/creativecommons\.org\//);
      for (const l of locales) expect(img.alt[l].trim(), `${key} ${l}`).not.toBe("");
    }
  });

  it("covers every region and falls back from trip to region", () => {
    for (const r of tripRegions) expect(images[regionCover(r)]).toBeDefined();
    expect(tripCover("kel-suu-lake", "naryn")).toBe("kel-suu");
    expect(tripCover("admin-made-trip", "batken")).toBe(regionCover("batken"));
  });
});

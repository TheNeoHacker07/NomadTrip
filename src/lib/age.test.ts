import { describe, expect, it } from "vitest";
import { ageOn } from "./age";

describe("ageOn", () => {
  it("counts whole years at the given date", () => {
    expect(ageOn("1990-06-15", "2027-06-14")).toBe(36);
    expect(ageOn("1990-06-15", "2027-06-15")).toBe(37);
    expect(ageOn("1990-06-15", "2027-12-31")).toBe(37);
  });
  it("handles infants and same-day birth", () => {
    expect(ageOn("2027-03-01", "2027-03-01")).toBe(0);
    expect(ageOn("2026-09-01", "2027-03-01")).toBe(0);
  });
  it("handles leap-day birthdays", () => {
    expect(ageOn("2000-02-29", "2027-02-28")).toBe(26);
    expect(ageOn("2000-02-29", "2027-03-01")).toBe(27);
  });
  it("returns null for birth after the date or malformed input", () => {
    expect(ageOn("2028-01-01", "2027-01-01")).toBeNull();
    expect(ageOn("", "2027-01-01")).toBeNull();
    expect(ageOn("1990-02-30", "2027-01-01")).toBeNull();
    expect(ageOn("1990-01-01", "nope")).toBeNull();
  });
});

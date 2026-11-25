import { describe, expect, it } from "vitest";
import { localeFromPathname, negotiateLocale, parseAcceptLanguage } from "./negotiate";

describe("parseAcceptLanguage", () => {
  it("uses primary subtag and q-values", () => {
    expect(parseAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
    expect(parseAcceptLanguage("de;q=0.9,ky;q=0.5,en;q=0.1")).toBe("ky");
    expect(parseAcceptLanguage("en;q=0.2, ru;q=0.8")).toBe("ru");
  });
  it("ignores q=0, unsupported and malformed input", () => {
    expect(parseAcceptLanguage("ru;q=0,fr")).toBeUndefined();
    expect(parseAcceptLanguage("*")).toBeUndefined();
    expect(parseAcceptLanguage("")).toBeUndefined();
    expect(parseAcceptLanguage(null)).toBeUndefined();
  });
});

describe("negotiateLocale", () => {
  it("prefers a valid cookie, then header, then en", () => {
    expect(negotiateLocale("ky", "ru")).toBe("ky");
    expect(negotiateLocale("xx", "ru")).toBe("ru");
    expect(negotiateLocale(undefined, null)).toBe("en");
  });
});

describe("localeFromPathname", () => {
  it("detects only supported prefixes", () => {
    expect(localeFromPathname("/ru")).toBe("ru");
    expect(localeFromPathname("/ky/trips/x")).toBe("ky");
    expect(localeFromPathname("/xx/admin")).toBeUndefined();
    expect(localeFromPathname("/")).toBeUndefined();
    expect(localeFromPathname("/ruin")).toBeUndefined();
  });
});

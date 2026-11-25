import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultLocale, locales, namespaces } from "./config";
import { interpolate, plural } from "./format";
import { localize } from "./localize";

const root = join(__dirname, "dictionaries");
const load = (locale: string, ns: string): unknown => JSON.parse(readFileSync(join(root, locale, `${ns}.json`), "utf8"));

/** Flattens nested objects to `a.b.c -> string` entries. */
function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.assign({}, ...Object.entries(value).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)));
  }
  return { [prefix]: value };
}

describe("dictionaries", () => {
  it("has exactly the registered namespace files in every locale", () => {
    for (const locale of locales) {
      const files = readdirSync(join(root, locale)).map((f) => f.replace(/\.json$/, "")).sort();
      expect(files).toEqual([...namespaces].sort());
    }
  });

  for (const ns of namespaces) {
    for (const locale of locales.filter((l) => l !== defaultLocale)) {
      it(`${locale}/${ns} has the same keys as en and no empty strings`, () => {
        const en = flatten(load(defaultLocale, ns));
        const other = flatten(load(locale, ns));
        expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
        for (const [key, value] of Object.entries(other)) {
          expect(typeof value, `${locale}/${ns}:${key}`).toBe("string");
          expect((value as string).trim(), `${locale}/${ns}:${key}`).not.toBe("");
        }
        // Placeholders must match so interpolation never drops a variable.
        const vars = (s: unknown) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        for (const [key, value] of Object.entries(en)) expect(vars(other[key]), `${locale}/${ns}:${key}`).toEqual(vars(value));
      });
    }

    it(`en/${ns} has no empty strings`, () => {
      for (const [key, value] of Object.entries(flatten(load(defaultLocale, ns)))) {
        expect(typeof value, key).toBe("string");
        expect((value as string).trim(), key).not.toBe("");
      }
    });
  }
});

describe("format helpers", () => {
  const forms = { one: "{count} день", few: "{count} дня", many: "{count} дней", other: "{count} дня" };
  it("picks Russian plural categories", () => {
    expect(plural(forms, 1, "ru")).toBe("1 день");
    expect(plural(forms, 3, "ru")).toBe("3 дня");
    expect(plural(forms, 5, "ru")).toBe("5 дней");
    expect(plural(forms, 21, "ru")).toBe("21 день");
  });
  it("interpolates and keeps unknown placeholders", () => {
    expect(interpolate("a {x} {y}", { x: 1 })).toBe("a 1 {y}");
  });
  it("localize falls back to en", () => {
    expect(localize({ en: "a", ru: "b", ky: "" }, "ky")).toBe("a");
    expect(localize({ en: "a", ru: "b", ky: "c" }, "ru")).toBe("b");
  });
});

describe("booking dictionary coverage", () => {
  it("has a label for every option value and a message for every error code", async () => {
    const { options, errorCodes } = await import("@/lib/booking-input");
    for (const locale of locales) {
      const dict = load(locale, "booking") as {
        options: Record<string, Record<string, string>>;
        errors: Record<string, string>;
        messages: Record<string, unknown>;
      };
      for (const [group, values] of Object.entries(options)) {
        expect(Object.keys(dict.options[group]).sort(), `${locale}:${group}`).toEqual([...values].sort());
      }
      expect(Object.keys(dict.errors).sort(), locale).toEqual([...errorCodes].sort());
      for (const code of ["check_fields", "invalid_submission", "departure_not_found", "departure_closed", "sold_out", "not_enough_seats"]) {
        expect(dict.messages[code], `${locale}:${code}`).toBeTruthy();
      }
    }
  });
});

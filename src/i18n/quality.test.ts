import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { namespaces } from "./config";
import { plural, type PluralForms } from "./format";

const root = join(__dirname, "dictionaries");
const load = (locale: string, ns: string): Record<string, unknown> => JSON.parse(readFileSync(join(root, locale, `${ns}.json`), "utf8"));

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (value !== null && typeof value === "object") {
    return Object.assign({}, ...Object.entries(value).map(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k)));
  }
  return { [prefix]: String(value) };
}

/** Walks a dictionary and returns every plural object (`{one, few, many, other}`) by dotted path. */
function pluralEntries(value: unknown, prefix = "", out: Record<string, PluralForms> = {}): Record<string, PluralForms> {
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.includes("one") && keys.includes("other")) out[prefix] = value as PluralForms;
    else for (const [k, v] of Object.entries(value)) pluralEntries(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

const allPlurals = (locale: string): Record<string, PluralForms> =>
  Object.assign({}, ...namespaces.map((ns) => Object.fromEntries(Object.entries(pluralEntries(load(locale, ns))).map(([k, v]) => [`${ns}.${k}`, v]))));

/** Brand names, codes and technical labels that legitimately stay in Latin script in ru/ky. */
const LATIN_ALLOWED = new Set(["NomadTrip", "WhatsApp", "Telegram", "FRU", "OSS", "USD", "UTC", "TK", "Slug", "slug", "Wikimedia", "Commons", "CSV"]);
const stripVars = (s: string) => s.replace(/\{\w+\}|%s/g, "");

describe.each(["ru", "ky"] as const)("%s text quality", (locale) => {
  const entries = Object.assign({}, ...namespaces.map((ns) => Object.fromEntries(Object.entries(flatten(load(locale, ns))).map(([k, v]) => [`${ns}.${k}`, v]))));

  it("has no untranslated English: Latin-only values and Latin words must be allowlisted", () => {
    const offenders: string[] = [];
    for (const [key, value] of Object.entries(entries as Record<string, string>)) {
      const words = stripVars(value).match(/[A-Za-z]+/g) ?? [];
      const bad = words.filter((w) => !LATIN_ALLOWED.has(w));
      if (bad.length > 0) offenders.push(`${key}: ${value}`);
    }
    expect(offenders).toEqual([]);
  });
});

/** Entries that quote the Kyrgyz word for yurt ("боз үй") on purpose. */
const RU_KYRGYZ_TERMS = new Set(["content.yurtLife.intro"]);

describe("script purity", () => {
  it("ru values do not use Kyrgyz-only letters (ң ү ө)", () => {
    const bad = namespaces.flatMap((ns) =>
      Object.entries(flatten(load("ru", ns))).filter(([k, v]) => /[ңүөҢҮӨ]/.test(v) && !RU_KYRGYZ_TERMS.has(`${ns}.${k}`)).map(([k, v]) => `${ns}.${k}: ${v}`),
    );
    expect(bad).toEqual([]);
  });
});

describe("plural entries", () => {
  it("every message with {count} lives in a plural entry with all four categories", () => {
    for (const locale of ["en", "ru", "ky"]) {
      for (const [key, forms] of Object.entries(allPlurals(locale))) {
        for (const cat of ["one", "few", "many", "other"] as const) {
          expect(typeof forms[cat], `${locale}:${key}.${cat}`).toBe("string");
          expect(forms[cat].includes("{count}"), `${locale}:${key}.${cat} must contain {count}`).toBe(true);
        }
      }
      const standalone = namespaces.flatMap((ns) =>
        Object.entries(flatten(load(locale, ns))).filter(([k, v]) => v.includes("{count}") && !/\.(one|few|many|other)$/.test(k)).map(([k]) => `${ns}.${k}`),
      );
      expect(standalone, `${locale}: {count} outside a plural entry`).toEqual(["booking.summary.line"]);
    }
  });

  it("ru plural entries use distinct one / few / many forms; en distinguishes one from other", () => {
    for (const [key, f] of Object.entries(allPlurals("ru"))) {
      if (key === "admin.pax") continue; // abbreviation "чел." does not inflect
      if (key === "booking.fields.maxTravelers") continue; // "не более 2 / 5 путешественников": few and many coincide
      expect(new Set([f.one, f.few, f.many]).size, key).toBe(3);
    }
    for (const [key, f] of Object.entries(allPlurals("en"))) {
      if (key === "admin.pax") continue; // "pax" is the same in singular and plural
      expect(f.one, key).not.toBe(f.other);
    }
  });

  const ruNoun = (entry: string, expected: Record<number, string>) => {
    it(`ru ${entry} at n = 1, 2, 5, 11, 21, 22, 25`, () => {
      const forms = allPlurals("ru")[entry];
      for (const [n, text] of Object.entries(expected)) expect(plural(forms, Number(n), "ru"), `n=${n}`).toBe(text);
    });
  };

  ruNoun("filters.count", { 1: "1 поездка", 2: "2 поездки", 5: "5 поездок", 11: "11 поездок", 21: "21 поездка", 22: "22 поездки", 25: "25 поездок" });
  ruNoun("common.ui.days", { 1: "1 день", 2: "2 дня", 5: "5 дней", 11: "11 дней", 21: "21 день", 22: "22 дня", 25: "25 дней" });
  ruNoun("common.ui.seatsLeft", {
    1: "Осталось 1 место", 2: "Осталось 2 места", 5: "Осталось 5 мест", 11: "Осталось 11 мест", 21: "Осталось 21 место", 22: "Осталось 22 места", 25: "Осталось 25 мест",
  });
  ruNoun("booking.summary.nights", { 1: "1 ночь", 2: "2 ночи", 5: "5 ночей", 11: "11 ночей", 21: "21 ночь", 22: "22 ночи", 25: "25 ночей" });
  ruNoun("booking.fields.ageAtDeparture", {
    1: "Возраст на дату выезда: 1 год", 2: "Возраст на дату выезда: 2 года", 5: "Возраст на дату выезда: 5 лет", 11: "Возраст на дату выезда: 11 лет",
    21: "Возраст на дату выезда: 21 год", 22: "Возраст на дату выезда: 22 года", 25: "Возраст на дату выезда: 25 лет",
  });
  ruNoun("admin.departures.bookingsCount", {
    1: "1 бронирование", 2: "2 бронирования", 5: "5 бронирований", 11: "11 бронирований", 21: "21 бронирование", 22: "22 бронирования", 25: "25 бронирований",
  });

  it("en and ky pick sensible forms", () => {
    expect(plural(allPlurals("en")["filters.count"], 1, "en")).toBe("1 trip");
    expect(plural(allPlurals("en")["filters.count"], 5, "en")).toBe("5 trips");
    for (const n of [1, 2, 5, 21]) expect(plural(allPlurals("ky")["filters.count"], n, "ky")).toBe(`${n} саякат`);
  });
});

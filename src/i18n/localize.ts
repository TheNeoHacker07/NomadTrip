import { defaultLocale, type Locale } from "./config";

/** A value stored once per locale (trip title, itinerary, …). */
export type Localized<T> = Record<Locale, T>;

/** Picks the value for `lang`, falling back to English when that locale's entry is missing or empty. */
export function localize<T>(value: Localized<T>, lang: Locale): T {
  const v = value[lang];
  if (v === undefined || v === null || v === "") return value[defaultLocale];
  return v;
}

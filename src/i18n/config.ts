export const locales = ["en", "ru", "ky"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const isLocale = (value: unknown): value is Locale => typeof value === "string" && (locales as readonly string[]).includes(value);

/** Native names, shown in the language switcher. */
export const localeLabels: Record<Locale, string> = { en: "English", ru: "Русский", ky: "Кыргызча" };

/** BCP 47 tags passed to `Intl` / `toLocaleDateString`. */
export const intlLocale: Record<Locale, string> = { en: "en-GB", ru: "ru-RU", ky: "ky-KG" };

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Dictionary namespaces: one JSON file per namespace under `dictionaries/<locale>/`. */
export const namespaces = ["common", "home", "trip", "booking", "confirmation", "admin", "filters", "content", "included", "discover", "manage", "inquiry"] as const;

import { defaultLocale, isLocale, locales, type Locale } from "./config";

/**
 * Picks the best supported locale from an `Accept-Language` header
 * (`ru-RU,ru;q=0.9,en;q=0.8` -> `ru`). Matches on the primary subtag; ties keep header order.
 * Returns `undefined` when nothing supported is listed.
 */
export function parseAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number(q.slice(2)) : 1;
      return { primary: tag.trim().toLowerCase().split("-")[0], quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((e) => e.primary && e.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map((e) => e.primary).find(isLocale);
}

/** Cookie first, then Accept-Language, then the default locale. */
export function negotiateLocale(cookieValue: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  return parseAcceptLanguage(acceptLanguage) ?? defaultLocale;
}

/** The locale prefix of `/ru/trips/x` (`ru`), if the first segment is a supported locale. */
export function localeFromPathname(pathname: string): Locale | undefined {
  const first = pathname.split("/")[1];
  return (locales as readonly string[]).includes(first) ? (first as Locale) : undefined;
}

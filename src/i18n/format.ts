import { defaultLocale, intlLocale, type Locale } from "./config";

/** Plural entry: every locale carries all four keys (unused categories repeat `other`). */
export type PluralForms = { one: string; few: string; many: string; other: string };

/** Replaces `{name}` placeholders. Unknown placeholders are left untouched. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Chooses the plural form for `count` using `Intl.PluralRules` and fills `{count}`. */
export function plural(forms: PluralForms, count: number, lang: Locale, vars: Record<string, string | number> = {}): string {
  const category = new Intl.PluralRules(intlLocale[lang]).select(count) as keyof PluralForms;
  return interpolate(forms[category] ?? forms.other, { count, ...vars });
}

/** Alternate-language map for `metadata.alternates.languages`; `path` is locale-less, e.g. `/trips/x`. */
export function languageAlternates(path: string, locales: readonly Locale[]) {
  const suffix = path === "/" ? "" : path;
  return { ...Object.fromEntries(locales.map((l) => [l, `/${l}${suffix}`])), "x-default": `/${defaultLocale}${suffix}` };
}

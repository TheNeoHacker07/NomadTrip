import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { isLocale, namespaces, type Locale } from "./config";

import type common from "./dictionaries/en/common.json";
import type home from "./dictionaries/en/home.json";
import type trip from "./dictionaries/en/trip.json";
import type booking from "./dictionaries/en/booking.json";
import type confirmation from "./dictionaries/en/confirmation.json";
import type admin from "./dictionaries/en/admin.json";
import type filters from "./dictionaries/en/filters.json";
import type content from "./dictionaries/en/content.json";
import type included from "./dictionaries/en/included.json";
import type manage from "./dictionaries/en/manage.json";
import type inquiry from "./dictionaries/en/inquiry.json";

/** Namespace -> dictionary shape, typed from the `en` files. */
export type Dictionaries = {
  common: typeof common;
  home: typeof home;
  trip: typeof trip;
  booking: typeof booking;
  confirmation: typeof confirmation;
  admin: typeof admin;
  filters: typeof filters;
  content: typeof content;
  included: typeof included;
  manage: typeof manage;
  inquiry: typeof inquiry;
};
export type Namespace = keyof Dictionaries;
// Keeps config.namespaces and the typed dictionaries in lockstep.
const _namespacesMatch: readonly Namespace[] = namespaces;
void _namespacesMatch;

const loaders = {
  en: {
    common: () => import("./dictionaries/en/common.json"),
    home: () => import("./dictionaries/en/home.json"),
    trip: () => import("./dictionaries/en/trip.json"),
    booking: () => import("./dictionaries/en/booking.json"),
    confirmation: () => import("./dictionaries/en/confirmation.json"),
    admin: () => import("./dictionaries/en/admin.json"),
    filters: () => import("./dictionaries/en/filters.json"),
    content: () => import("./dictionaries/en/content.json"),
    included: () => import("./dictionaries/en/included.json"),
    manage: () => import("./dictionaries/en/manage.json"),
    inquiry: () => import("./dictionaries/en/inquiry.json"),
  },
  ru: {
    common: () => import("./dictionaries/ru/common.json"),
    home: () => import("./dictionaries/ru/home.json"),
    trip: () => import("./dictionaries/ru/trip.json"),
    booking: () => import("./dictionaries/ru/booking.json"),
    confirmation: () => import("./dictionaries/ru/confirmation.json"),
    admin: () => import("./dictionaries/ru/admin.json"),
    filters: () => import("./dictionaries/ru/filters.json"),
    content: () => import("./dictionaries/ru/content.json"),
    included: () => import("./dictionaries/ru/included.json"),
    manage: () => import("./dictionaries/ru/manage.json"),
    inquiry: () => import("./dictionaries/ru/inquiry.json"),
  },
  ky: {
    common: () => import("./dictionaries/ky/common.json"),
    home: () => import("./dictionaries/ky/home.json"),
    trip: () => import("./dictionaries/ky/trip.json"),
    booking: () => import("./dictionaries/ky/booking.json"),
    confirmation: () => import("./dictionaries/ky/confirmation.json"),
    admin: () => import("./dictionaries/ky/admin.json"),
    filters: () => import("./dictionaries/ky/filters.json"),
    content: () => import("./dictionaries/ky/content.json"),
    included: () => import("./dictionaries/ky/included.json"),
    manage: () => import("./dictionaries/ky/manage.json"),
    inquiry: () => import("./dictionaries/ky/inquiry.json"),
  },
} satisfies Record<Locale, { [N in Namespace]: () => Promise<{ default: Dictionaries[N] }> }>;

/** Current request locale from the `[lang]` root param; unknown values 404. Server Components only. */
export async function getLang(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

/**
 * Typed dictionary for one namespace in the current locale (read from root params).
 * Pass `forLang` only where root params are unavailable (e.g. a Server Action that validated the locale itself).
 */
export async function getDictionary<N extends Namespace>(namespace: N, forLang?: Locale): Promise<Dictionaries[N]> {
  const locale = forLang ?? (await getLang());
  const mod = await (loaders[locale][namespace] as unknown as () => Promise<{ default: Dictionaries[N] }>)();
  return mod.default;
}

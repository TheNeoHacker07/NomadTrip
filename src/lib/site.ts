import type { Metadata } from "next";
import { locales } from "@/i18n/config";
import { languageAlternates } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { images, type ImageKey } from "./images";
import type { Locale } from "@/i18n/config";

/** Public origin of the site (no trailing slash). */
export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export const ogLocale: Record<Locale, string> = { en: "en_GB", ru: "ru_RU", ky: "ky_KG" };

/** Public, indexable pages (locale-less paths). Admin and booking confirmations are deliberately absent. */
export const staticPublicPaths = ["", "/trips", "/departures", "/about", "/yurt-life", "/faq", "/whats-included", "/experiences", "/photo-credits", "/inquiry", "/manage-booking"];

/** Canonical + hreflang (incl. x-default), Open Graph and Twitter card for one localized page. `path` is locale-less ("/" for home). */
export function socialMetadata(opts: { lang: Locale; path: string; title: string; description: string; image?: ImageKey; type?: "website" | "article" }): Metadata {
  const { lang, path, title, description, image, type = "website" } = opts;
  const url = `/${lang}${path === "/" ? "" : path}`;
  const img = image ? { url: images[image].src, width: images[image].width, height: images[image].height, alt: localize(images[image].alt, lang) } : undefined;
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path, locales) },
    openGraph: {
      type,
      url,
      siteName: "NomadTrip",
      title,
      description,
      locale: ogLocale[lang],
      alternateLocale: locales.filter((l) => l !== lang).map((l) => ogLocale[l]),
      images: img ? [img] : undefined,
    },
    twitter: { card: img ? "summary_large_image" : "summary", title, description, images: img ? [img.url] : undefined },
  };
}

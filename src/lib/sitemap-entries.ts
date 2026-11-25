import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { staticPublicPaths } from "./site";

/** One entry per locale × page, each with hreflang alternates incl. x-default (en). Never lists admin or booking-confirmation URLs. */
export function buildSitemapEntries(origin: string, tripSlugs: string[]): MetadataRoute.Sitemap {
  const paths = [...staticPublicPaths, ...tripSlugs.map((s) => `/trips/${s}`)];
  return paths.flatMap((path) => {
    const languages = {
      ...Object.fromEntries(locales.map((l) => [l, `${origin}/${l}${path}`])),
      "x-default": `${origin}/en${path}`,
    };
    return locales.map((l) => ({ url: `${origin}/${l}${path}`, alternates: { languages } }));
  });
}

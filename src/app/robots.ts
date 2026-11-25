import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteUrl } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection(); // read SITE_URL per request, not at build time
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/*/admin", "/*/bookings/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

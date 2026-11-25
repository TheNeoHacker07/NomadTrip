import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { buildSitemapEntries } from "@/lib/sitemap-entries";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const slugs = db.select({ slug: trips.slug }).from(trips).all().map((t) => t.slug);
  return buildSitemapEntries(siteUrl(), slugs);
}

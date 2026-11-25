import type { Metadata } from "next";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/content-blocks";
import { Photo } from "@/components/photo";
import { Skeleton } from "@/components/ui";
import { db } from "@/db";
import { trips } from "@/db/schema";
import { locales, type Locale } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import type { ImageKey } from "@/lib/images";

export async function generateMetadata(): Promise<Metadata> {
  const { experiences: c } = await getDictionary("included");
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { languages: languageAlternates("/experiences", locales) },
  };
}

/** Photo and the seed trips whose itineraries include each experience (slugs that no longer exist are skipped). */
const experiences = {
  horseRiding: { photo: "horse-riding", trips: ["song-kul-weekend", "tian-shan-horse-trek", "chon-kemin-valley", "great-nomad-journey", "talas-manas-ordo", "osh-alay-tulpar-kol"] },
  eagleHunting: { photo: "eagle-hunter", trips: ["issyk-kul-circle", "great-nomad-journey"] },
  feltMaking: { photo: "felt-making", trips: ["song-kul-weekend", "tian-shan-horse-trek", "chon-kemin-valley"] },
  nomadCooking: { photo: "food", trips: ["song-kul-weekend"] },
  trekking: { photo: "trekking", trips: ["tian-shan-horse-trek", "issyk-kul-circle", "kel-suu-lake", "batken-ak-suu", "great-nomad-journey"] },
  mountainLakes: { photo: "kel-suu", trips: ["song-kul-weekend", "kel-suu-lake", "sary-chelek-arslanbob", "osh-alay-tulpar-kol"] },
  stargazing: { photo: "night-sky", trips: ["song-kul-weekend"] },
  komuz: { photo: "komuz", trips: ["talas-manas-ordo"] },
} as const satisfies Record<string, { photo: ImageKey; trips: readonly string[] }>;

export default async function ExperiencesPage() {
  const [{ experiences: c }, lang] = await Promise.all([getDictionary("included"), getLang()]);
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <ul className="grid gap-6 sm:grid-cols-2">
        {(Object.keys(experiences) as (keyof typeof experiences)[]).map((key, i) => (
          <li key={key} className="card overflow-hidden">
            <Photo name={experiences[key].photo} sizes="(min-width: 1024px) 496px, (min-width: 640px) 50vw, 100vw" frame="aspect-[4/3]" priority={i === 0} className="[&>figcaption]:px-5 [&>figcaption]:pb-0 [&>div]:rounded-none" />
            <div className="p-5 pt-3">
              <h2 className="text-xl font-semibold tracking-tight">{c.items[key].title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.items[key].body}</p>
              <Suspense fallback={<Skeleton className="mt-4 h-6" />}>
                <TripLinks slugs={experiences[key].trips} lang={lang} label={c.tripsLabel} empty={c.noTrips} />
              </Suspense>
            </div>
          </li>
        ))}
      </ul>
      <Link href={`/${lang}#trips`} className="mt-10 inline-block font-semibold text-accent hover:underline">
        {c.cta} →
      </Link>
    </>
  );
}

async function TripLinks({ slugs, lang, label, empty }: { slugs: readonly string[]; lang: Locale; label: string; empty: string }) {
  await connection();
  const rows = db.select({ slug: trips.slug, title: trips.title }).from(trips).where(inArray(trips.slug, [...slugs])).all();
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const found = slugs.flatMap((s) => bySlug.get(s) ?? []);
  if (found.length === 0) return <p className="mt-4 text-xs text-muted">{empty}</p>;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {found.map((t) => (
          <li key={t.slug}>
            <Link href={`/${lang}/trips/${t.slug}`} className="inline-block rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent">
              {localize(t.title, lang)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

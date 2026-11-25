import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Photo } from "@/components/photo";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { getTripWithDepartures } from "@/lib/bookings";
import { tripCover } from "@/lib/images";
import { addDays, formatDate, usd } from "@/lib/pricing";

export async function generateMetadata({ params }: PageProps<"/[lang]/trips/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const lang = await getLang();
  const data = getTripWithDepartures(db, slug);
  if (!data) return {};
  return {
    title: localize(data.trip.title, lang),
    description: localize(data.trip.summary, lang),
    alternates: { languages: languageAlternates(`/trips/${slug}`, locales) },
  };
}

export default function TripPage({ params }: PageProps<"/[lang]/trips/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TripDetails params={params} />
    </Suspense>
  );
}

async function TripDetails({ params }: { params: PageProps<"/[lang]/trips/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const [lang, common, t] = await Promise.all([getLang(), getDictionary("common"), getDictionary("trip")]);
  const data = getTripWithDepartures(db, slug);
  if (!data) notFound();
  const { trip, departures } = data;
  const itinerary = localize(trip.itinerary, lang);

  return (
    <article className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <Photo
          name={tripCover(trip.slug, trip.region)}
          sizes="(min-width: 1024px) 680px, 100vw"
          frame="aspect-[16/9] sm:aspect-[2/1]"
          priority
          className="mb-6"
        />
        <div className="mb-2 flex items-center gap-3 text-sm text-muted">
          <span>
            {plural(common.ui.days, trip.durationDays, lang)} · {common.regions[trip.region]}
          </span>
          <DifficultyBadge level={trip.difficulty} label={common.difficulty[trip.difficulty]} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{localize(trip.title, lang)}</h1>
        <p className="mt-4 text-muted">{localize(trip.description, lang)}</p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {localize(trip.highlights, lang).map((h) => (
            <li key={h} className="rounded-full border border-border px-3 py-1 text-sm">
              {h}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 mb-4 text-xl font-semibold">{t.dayByDay}</h2>
        <ol className="space-y-3">
          {itinerary.map((d) => (
            <li key={d.day} className="card flex gap-4 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {d.day}
              </span>
              <div>
                <h3 className="font-medium">{d.title}</h3>
                <p className="text-sm text-muted">{d.description}</p>
                <p className="mt-1 text-xs text-muted">
                  {t.overnight}: {d.overnight}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <p className="text-sm text-muted">{t.pricePerPerson}</p>
          <p className="text-3xl font-bold">{usd(trip.pricePerPersonUsd)}</p>
          <p className="mt-1 text-xs text-muted">{t.priceIncludes}</p>
          <h2 className="mt-5 mb-2 text-sm font-semibold">{t.upcomingDepartures}</h2>
          {departures.length === 0 ? (
            <p className="text-sm text-muted">{t.noDepartures}</p>
          ) : (
            <ul className="space-y-2">
              {departures.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {formatDate(d.startDate, lang)} – {formatDate(addDays(d.startDate, trip.durationDays - 1), lang)}
                    </p>
                    <p className="text-xs text-muted">
                      {d.seatsLeft > 0 ? plural(common.ui.seatsLeft, d.seatsLeft, lang) : common.ui.fullyBooked}
                    </p>
                  </div>
                  {d.seatsLeft > 0 && (
                    <Link href={`/${lang}/trips/${trip.slug}/book?departure=${d.id}`} className="btn px-3 py-1.5">
                      {t.book}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { TripFiltersForm } from "@/components/trip-filters";
import { today } from "@/lib/bookings";
import { formatDate, usd } from "@/lib/pricing";
import { hasActiveFilters, parseTripFilters, searchTrips, type SearchParams } from "@/lib/trip-search";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary("common");
  return { title: { absolute: meta.title }, description: meta.description };
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const home = await getDictionary("home");
  return (
    <>
      <section className="mb-12 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold">{home.eyebrow}</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{home.headline}</h1>
        <p className="mt-4 text-lg text-muted">{home.intro}</p>
      </section>
      <h2 id="trips" className="mb-4 text-xl font-semibold">
        {home.chooseJourney}
      </h2>
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} />)}</div>}>
        <TripList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TripList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const [params, lang, common, home, t] = await Promise.all([
    searchParams,
    getLang(),
    getDictionary("common"),
    getDictionary("home"),
    getDictionary("filters"),
  ]);
  const filters = parseTripFilters(params);
  const trips = searchTrips(db, filters, today());
  // `priceFrom` holds a {price} slot so each language can place the amount (e.g. "from $1" / "$1 баштап").
  const [priceBefore, priceAfter] = home.priceFrom.split("{price}");
  return (
    <>
      <TripFiltersForm lang={lang} filters={filters} t={t} regionLabels={common.regions} />
      <p className="mb-4 text-sm text-muted" role="status">
        {plural(t.count, trips.length, lang)}
      </p>
      {trips.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">{t.emptyTitle}</p>
          <p className="mt-2 text-sm text-muted">{t.emptyHint}</p>
          {hasActiveFilters(filters) ? (
            <Link href={`/${lang}#trips`} className="btn mt-4">
              {t.clear}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/${lang}/trips/${trip.slug}`} className="card group p-6 transition hover:border-accent">
              <div className="mb-3 flex items-center justify-between text-sm text-muted">
                <span>
                  {plural(common.ui.days, trip.durationDays, lang)} · {common.regions[trip.region]}
                </span>
                <DifficultyBadge level={trip.difficulty} label={common.difficulty[trip.difficulty]} />
              </div>
              <h3 className="text-lg font-semibold group-hover:text-accent">{localize(trip.title, lang)}</h3>
              <p className="mt-2 text-sm text-muted">{localize(trip.summary, lang)}</p>
              <p className="mt-4 text-sm">
                {priceBefore}<span className="text-lg font-bold">{usd(trip.pricePerPersonUsd)}</span>{priceAfter} / {common.ui.perPerson}
              </p>
              <p className="mt-1 text-sm text-muted">
                {trip.nextDeparture ? `${t.nextDeparture}: ${formatDate(trip.nextDeparture, lang)}` : t.noOpenDates}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

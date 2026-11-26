import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { HornDivider } from "@/components/ornament";
import { Photo } from "@/components/photo";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { TripFiltersForm } from "@/components/trip-filters";
import { today } from "@/lib/bookings";
import { images, tripCover } from "@/lib/images";
import { formatDate, usd } from "@/lib/pricing";
import { socialMetadata } from "@/lib/site";
import { hasActiveFilters, parseTripFilters, searchTrips, type SearchParams } from "@/lib/trip-search";

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, lang] = await Promise.all([getDictionary("common"), getLang()]);
  return {
    ...socialMetadata({ lang, path: "/", title: meta.title, description: meta.description, image: "yurt-camp" }),
    title: { absolute: meta.title },
  };
}

const heroPhoto = "song-kul" as const;
const experienceCards = ["horseRiding", "eagleHunting", "feltMaking", "stargazing"] as const;
const experiencePhotos = { horseRiding: "horse-riding", eagleHunting: "eagle-hunter", feltMaking: "felt-making", stargazing: "night-sky" } as const;
const stepPhotos = ["jailoo", "yurt-interior", "trekking"] as const;
const ctaPhoto = "yurt-exterior" as const;

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [home, included, lang] = await Promise.all([getDictionary("home"), getDictionary("included"), getLang()]);
  const hero = images[heroPhoto];
  const credit = interpolate(included.photo.credit, { author: hero.author, license: hero.license });
  const steps = [home.steps.request, home.steps.confirm, home.steps.travel];
  const cta = images[ctaPhoto];
  const ctaCredit = interpolate(included.photo.credit, { author: cta.author, license: cta.license });
  return (
    <>
      <section className="relative isolate -mt-8 mb-14 mr-[calc(50%-50vw)] ml-[calc(50%-50vw)] flex min-h-[28rem] items-end overflow-hidden bg-primary sm:min-h-[34rem]">
        <Image
          src={hero.src}
          width={hero.width}
          height={hero.height}
          alt={localize(hero.alt, lang)}
          sizes="100vw"
          priority
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06161b]/90 via-[#06161b]/55 to-[#06161b]/20" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-24 text-white">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#f6c978]">{home.eyebrow}</p>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">{home.headline}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90">{home.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#trips" className="btn px-6 py-3 text-base">
              {home.heroBrowse} <span aria-hidden="true">↓</span>
            </a>
            <Link href={`/${lang}/whats-included`} className="inline-flex items-center rounded-xl border-2 border-white/80 px-6 py-3 text-base font-semibold text-white transition hover:bg-white hover:text-[#06161b]">
              {home.heroIncluded}
            </Link>
          </div>
          <p className="mt-8 text-xs text-white/80">
            <a href={hero.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">
              {credit}
            </a>
          </p>
        </div>
      </section>

      <h2 id="trips" className="mb-4 font-display text-3xl font-semibold tracking-tight">
        {home.chooseJourney}
      </h2>
      <Suspense fallback={<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80" />)}</div>}>
        <TripList searchParams={searchParams} />
      </Suspense>

      <HornDivider className="my-16" />

      <section aria-labelledby="exp-title" className="mb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <h2 id="exp-title" className="font-display text-3xl font-semibold tracking-tight">{home.experiencesTitle}</h2>
            <p className="mt-2 text-muted">{home.experiencesIntro}</p>
          </div>
          <Link href={`/${lang}/experiences`} className="font-semibold text-accent hover:underline">
            {home.experiencesLink} →
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {experienceCards.map((key) => (
            <li key={key}>
              <Link href={`/${lang}/experiences`} className="card group block overflow-hidden transition hover:border-accent hover:shadow-md">
                <Photo
                  name={experiencePhotos[key]}
                  sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw"
                  frame="aspect-[4/3]"
                  linkCredit={false}
                  className="[&>div]:rounded-none [&>div_img]:transition-transform [&>div_img]:duration-500 group-hover:[&>div_img]:scale-105 [&>figcaption]:px-4 [&>figcaption]:pb-0"
                />
                <p className="px-4 pb-4 pt-2 font-display text-lg font-semibold group-hover:text-accent">{included.experiences.items[key].title}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-title" className="mb-16 rounded-3xl bg-sky px-6 py-12 sm:px-10">
        <h2 id="how-title" className="font-display text-3xl font-semibold tracking-tight">{home.howTitle}</h2>
        <p className="mt-2 max-w-2xl text-muted">{home.howIntro}</p>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="card overflow-hidden">
              <Photo
                name={stepPhotos[i]}
                sizes="(min-width: 768px) 33vw, 100vw"
                frame="aspect-[16/10]"
                className="[&>div]:rounded-none [&>figcaption]:px-6"
              />
              <div className="px-6 pb-6 pt-3">
                <span aria-hidden="true" className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-gold font-display text-lg font-bold text-gold-fg">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 pb-8 pt-20 text-center text-white sm:px-10 sm:pt-24">
        <Image
          src={cta.src}
          width={cta.width}
          height={cta.height}
          alt={localize(cta.alt, lang)}
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="absolute inset-0 -z-10 size-full object-cover object-[85%_60%]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06161b]/85 via-[#06161b]/50 to-[#06161b]/25" />
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{home.ctaTitle}</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/90">{home.ctaBody}</p>
        <a href="#trips" className="btn mt-8 px-6 py-3 text-base">
          {home.ctaButton}
        </a>
        <p className="mt-12 text-right text-xs text-white/75">
          <a href={cta.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">
            {ctaCredit}
          </a>
        </p>
      </section>
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/${lang}/trips/${trip.slug}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg motion-reduce:transform-none">
              <Photo
                name={tripCover(trip.slug, trip.region)}
                sizes="(min-width: 1024px) 496px, (min-width: 640px) 50vw, 100vw"
                frame="aspect-[16/9]"
                linkCredit={false}
                className="[&>div]:rounded-none [&>figcaption]:px-5 [&>figcaption]:pb-0"
              />
              <div className="flex flex-1 flex-col p-5 pt-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="chip">{common.regions[trip.region]}</span>
                  <span className="chip">{plural(common.ui.days, trip.durationDays, lang)}</span>
                  <DifficultyBadge level={trip.difficulty} label={common.difficulty[trip.difficulty]} />
                </div>
                <h3 className="font-display text-xl font-semibold group-hover:text-accent">{localize(trip.title, lang)}</h3>
                <p className="mt-2 text-sm text-muted">{localize(trip.summary, lang)}</p>
                <div className="mt-auto pt-4">
                  <p className="text-sm">
                    {priceBefore}<span className="font-display text-2xl font-bold text-accent">{usd(trip.pricePerPersonUsd)}</span>{priceAfter} <span className="text-muted">/ {common.ui.perPerson}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {trip.nextDeparture ? `${t.nextDeparture}: ${formatDate(trip.nextDeparture, lang)}` : t.noOpenDates}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

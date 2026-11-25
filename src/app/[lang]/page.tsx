import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { listTrips } from "@/lib/bookings";
import { usd } from "@/lib/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary("common");
  return { title: { absolute: meta.title }, description: meta.description };
}

export default async function Home() {
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
        <TripList />
      </Suspense>
    </>
  );
}

async function TripList() {
  await connection();
  const [lang, common, home] = await Promise.all([getLang(), getDictionary("common"), getDictionary("home")]);
  const trips = listTrips(db);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {trips.map((t) => (
        <Link key={t.id} href={`/${lang}/trips/${t.slug}`} className="card group p-6 transition hover:border-accent">
          <div className="mb-3 flex items-center justify-between text-sm text-muted">
            <span>
              {plural(common.ui.days, t.durationDays, lang)} · {common.regions[t.region]}
            </span>
            <DifficultyBadge level={t.difficulty} label={common.difficulty[t.difficulty]} />
          </div>
          <h3 className="text-lg font-semibold group-hover:text-accent">{localize(t.title, lang)}</h3>
          <p className="mt-2 text-sm text-muted">{localize(t.summary, lang)}</p>
          <p className="mt-4 text-sm">
            {home.from} <span className="text-lg font-bold">{usd(t.pricePerPersonUsd)}</span> / {common.ui.perPerson}
          </p>
        </Link>
      ))}
    </div>
  );
}

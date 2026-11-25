import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { listTrips } from "@/lib/bookings";
import { usd } from "@/lib/pricing";

export default function Home() {
  return (
    <>
      <section className="mb-12 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold">Kyrgyzstan · Tian Shan</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Sleep under the shanyrak.</h1>
        <p className="mt-4 text-lg text-muted">
          Journeys from a weekend to a full month across alpine lakes, high passes and summer pastures — every night in
          a traditional yurt camp, hosted by nomad families.
        </p>
      </section>
      <h2 id="trips" className="mb-4 text-xl font-semibold">
        Choose your journey
      </h2>
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} />)}</div>}>
        <TripList />
      </Suspense>
    </>
  );
}

async function TripList() {
  await connection();
  const trips = listTrips(db);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {trips.map((t) => (
        <Link key={t.id} href={`/trips/${t.slug}`} className="card group p-6 transition hover:border-accent">
          <div className="mb-3 flex items-center justify-between text-sm text-muted">
            <span>
              {t.durationDays} days · {t.region}
            </span>
            <DifficultyBadge level={t.difficulty} />
          </div>
          <h3 className="text-lg font-semibold group-hover:text-accent">{t.title}</h3>
          <p className="mt-2 text-sm text-muted">{t.summary}</p>
          <p className="mt-4 text-sm">
            from <span className="text-lg font-bold">{usd(t.pricePerPersonUsd)}</span> / person
          </p>
        </Link>
      ))}
    </div>
  );
}

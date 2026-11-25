import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { listTripsAdmin } from "@/lib/admin";
import { usd } from "@/lib/pricing";

export async function generateMetadata() {
  const { trips } = await getDictionary("admin");
  return { title: trips.metaTitle, robots: { index: false } };
}

export default async function AdminTripsPage() {
  const [lang, a] = await Promise.all([getLang(), getDictionary("admin")]);
  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{a.trips.title}</h1>
        <Link href={`/${lang}/admin/trips/new`} className="btn">{a.trips.new}</Link>
      </div>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <TripList />
      </Suspense>
    </>
  );
}

async function TripList() {
  const [lang, common, a] = await Promise.all([getLang(), getDictionary("common"), getDictionary("admin")]);
  if (!isAdminAuthorization((await headers()).get("authorization"))) return <p className="text-muted">{a.unauthorized}</p>;
  await connection();
  const rows = listTripsAdmin(db);
  if (rows.length === 0) return <p className="text-muted">{a.trips.empty}</p>;
  return (
    <div className="space-y-3">
      {rows.map(({ trip, departureCount, bookingCount }) => (
        <Link key={trip.id} href={`/${lang}/admin/trips/${trip.id}`} className="card flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:border-accent">
          <span className="font-semibold">{localize(trip.title, lang)}</span>
          <span className="font-mono text-xs text-muted">{trip.slug}</span>
          <DifficultyBadge level={trip.difficulty} label={common.difficulty[trip.difficulty]} />
          <span className="text-sm text-muted">
            {common.regions[trip.region]} · {plural(a.days, trip.durationDays, lang)} ·{" "}
            {interpolate(a.trips.perPerson, { price: usd(trip.pricePerPersonUsd) })}
          </span>
          <span className="ml-auto text-sm text-muted">
            {a.trips.departures}: {departureCount} · {a.trips.bookings}: {bookingCount}
          </span>
        </Link>
      ))}
    </div>
  );
}

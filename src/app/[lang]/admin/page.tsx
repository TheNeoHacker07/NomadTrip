import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { bookingStatusCounts, listBookingsFiltered, listTripOptions, parseBookingFilters } from "@/lib/admin";
import { connection } from "next/server";
import { bookingStatuses } from "@/db/schema";
import { formatDate, usd } from "@/lib/pricing";
import { updateBookingStatus } from "./actions";

export async function generateMetadata() {
  const { metaTitle } = await getDictionary("admin");
  return { title: metaTitle, robots: { index: false } };
}

export default async function AdminPage({ searchParams }: PageProps<"/[lang]/admin">) {
  const a = await getDictionary("admin");
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{a.title}</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <BookingList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BookingList({ searchParams }: { searchParams: PageProps<"/[lang]/admin">["searchParams"] }) {
  const [lang, common, a, booking] = await Promise.all([
    getLang(),
    getDictionary("common"),
    getDictionary("admin"),
    getDictionary("booking"),
  ]);
  // The proxy challenges for credentials, but pages re-check on their own.
  if (!isAdminAuthorization((await headers()).get("authorization"))) {
    return <p className="text-muted">{a.unauthorized}</p>;
  }
  const label = (group: keyof typeof booking.options, value: string) =>
    (booking.options[group] as Record<string, string>)[value] ?? value;
  await connection();
  const filters = parseBookingFilters(await searchParams);
  const rows = listBookingsFiltered(db, filters);
  const counts = bookingStatusCounts(db, filters);
  const tripOptions = listTripOptions(db);
  const hasFilters = Object.values(filters).some((v) => v !== undefined);
  const statusHref = (status?: string) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v !== undefined && k !== "status") p.set(k, String(v));
    if (status) p.set("status", status);
    const qs = p.toString();
    return `/${lang}/admin${qs ? `?${qs}` : ""}`;
  };
  const tab = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-accent bg-accent text-accent-fg" : "border-border hover:border-accent"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={a.filters.status}>
        <Link href={statusHref()} className={tab(!filters.status)}>
          {a.filters.all} ({counts.pending + counts.confirmed + counts.cancelled})
        </Link>
        {bookingStatuses.map((s) => (
          <Link key={s} href={statusHref(s)} className={tab(filters.status === s)}>
            {common.status[s]} ({counts[s]})
          </Link>
        ))}
      </div>

      <form method="get" className="card grid gap-3 p-4 text-sm md:grid-cols-5">
        {filters.status && <input type="hidden" name="status" value={filters.status} />}
        <div className="md:col-span-2">
          <label className="label" htmlFor="f-q">{a.filters.search}</label>
          <input id="f-q" name="q" defaultValue={filters.q} placeholder={a.filters.searchPlaceholder} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="f-trip">{a.filters.trip}</label>
          <select id="f-trip" name="trip" defaultValue={filters.trip ?? ""} className="field">
            <option value="">{a.filters.allTrips}</option>
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id}>{localize(trip.title, lang)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-from">{a.filters.from}</label>
          <input id="f-from" name="from" type="date" defaultValue={filters.from} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="f-to">{a.filters.to}</label>
          <input id="f-to" name="to" type="date" defaultValue={filters.to} className="field" />
        </div>
        <div className="flex gap-2 md:col-span-5">
          <button className="btn px-4 py-1.5">{a.filters.apply}</button>
          {hasFilters && (
            <Link href={`/${lang}/admin`} className="rounded-lg border border-border px-4 py-1.5 hover:border-accent">
              {a.filters.reset}
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 && <p className="text-muted">{hasFilters ? a.noMatches : a.empty}</p>}
      {rows.map(({ booking: b, departure, trip, travelers }) => (
        <details key={b.id} className="card p-5">
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono font-semibold">{b.reference}</span>
            <StatusBadge status={b.status} label={common.status[b.status]} />
            <span className="font-medium">{localize(trip.title, lang)}</span>
            <span className="text-sm text-muted">
              {formatDate(departure.startDate, lang)} · {plural(a.pax, b.travelerCount, lang)} · {usd(b.totalPriceUsd)}
            </span>
            <span className="ml-auto text-sm text-muted">{b.contactName}</span>
          </summary>

          <div className="mt-4 grid gap-6 text-sm md:grid-cols-3">
            <dl className="space-y-1">
              <dt className="font-semibold">{a.contact}</dt>
              <dd>{b.contactName} · {b.country}</dd>
              <dd>{b.email}</dd>
              <dd>{b.phone} ({label("messenger", b.messenger)})</dd>
              <dd className="pt-2 font-semibold">{a.emergency}</dd>
              <dd>{b.emergencyName} · {b.emergencyPhone}</dd>
            </dl>
            <dl className="space-y-1">
              <dt className="font-semibold">{a.experience}</dt>
              <dd>{a.yurt}: {label("yurtArrangement", b.yurtArrangement)}</dd>
              <dd>{a.fitness}: {label("fitnessLevel", b.fitnessLevel)}</dd>
              <dd>{a.interests}: {b.interests.map((i) => label("interests", i)).join(", ") || common.ui.dash}</dd>
              {b.occasion && <dd>{a.occasion}: {b.occasion}</dd>}
              {b.medicalNotes && <dd className="text-red-700 dark:text-red-300">{a.health}: {b.medicalNotes}</dd>}
            </dl>
            <dl className="space-y-1">
              <dt className="font-semibold">{a.logistics}</dt>
              <dd>{a.arrival}: {label("arrivalAirport", b.arrivalAirport)} {b.arrivalFlight && `· ${b.arrivalFlight}`}</dd>
              <dd>{a.pickup}: {b.needsAirportPickup ? a.yes : a.no}</dd>
              {b.specialRequests && <dd>{a.requests}: {b.specialRequests}</dd>}
              {b.referralSource && <dd>{a.heardVia}: {b.referralSource}</dd>}
              <dd className="text-muted">{interpolate(a.received, { date: `${formatDate(b.createdAt.slice(0, 10), lang)} ${b.createdAt.slice(11, 16)}` })}</dd>
            </dl>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 pr-4 font-medium">{a.traveler}</th>
                  <th className="py-1 pr-4 font-medium">{a.born}</th>
                  <th className="py-1 pr-4 font-medium">{a.nationality}</th>
                  <th className="py-1 pr-4 font-medium">{a.diet}</th>
                  <th className="py-1 pr-4 font-medium">{a.riding}</th>
                  <th className="py-1 font-medium">{a.allergies}</th>
                </tr>
              </thead>
              <tbody>
                {travelers.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-1 pr-4">{t.fullName}</td>
                    <td className="py-1 pr-4">{t.dateOfBirth}</td>
                    <td className="py-1 pr-4">{t.nationality}</td>
                    <td className="py-1 pr-4">{label("diet", t.diet)}</td>
                    <td className="py-1 pr-4">{label("ridingExperience", t.ridingExperience)}</td>
                    <td className="py-1">{t.allergies ?? common.ui.dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {b.status !== "cancelled" && (
            <form action={updateBookingStatus} className="mt-4 flex gap-2">
              <input type="hidden" name="bookingId" value={b.id} />
              {b.status === "pending" && (
                <button name="status" value="confirmed" className="btn px-3 py-1.5">
                  {a.confirm}
                </button>
              )}
              <button name="status" value="cancelled" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent">
                {a.cancelBooking}
              </button>
            </form>
          )}
        </details>
      ))}
    </div>
  );
}

import { headers } from "next/headers";
import { Suspense } from "react";
import { Skeleton, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { listBookings } from "@/lib/bookings";
import { formatDate, usd } from "@/lib/pricing";
import { updateBookingStatus } from "./actions";

export async function generateMetadata() {
  const { metaTitle } = await getDictionary("admin");
  return { title: metaTitle, robots: { index: false } };
}

export default async function AdminPage() {
  const a = await getDictionary("admin");
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">{a.title}</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <BookingList />
      </Suspense>
    </>
  );
}

async function BookingList() {
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
  const rows = listBookings(db);
  if (rows.length === 0) return <p className="text-muted">{a.empty}</p>;

  return (
    <div className="space-y-4">
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
              <dd className="text-muted">{interpolate(a.received, { date: b.createdAt })}</dd>
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

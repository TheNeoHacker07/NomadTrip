import { headers } from "next/headers";
import { Suspense } from "react";
import { Skeleton, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { options } from "@/lib/booking-input";
import { listBookings } from "@/lib/bookings";
import { formatDate, usd } from "@/lib/pricing";
import { updateBookingStatus } from "./actions";

export const metadata = { title: "Bookings admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Bookings</h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <BookingList />
      </Suspense>
    </>
  );
}

const label = <K extends keyof typeof options>(group: K, value: string) =>
  (options[group] as Record<string, string>)[value] ?? value;

async function BookingList() {
  if (!isAdminAuthorization((await headers()).get("authorization"))) {
    return <p className="text-muted">Unauthorized.</p>;
  }
  const rows = listBookings(db);
  if (rows.length === 0) return <p className="text-muted">No bookings yet.</p>;

  return (
    <div className="space-y-4">
      {rows.map(({ booking: b, departure, trip, travelers }) => (
        <details key={b.id} className="card p-5">
          <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono font-semibold">{b.reference}</span>
            <StatusBadge status={b.status} />
            <span className="font-medium">{trip.title}</span>
            <span className="text-sm text-muted">
              {formatDate(departure.startDate)} · {b.travelerCount} pax · {usd(b.totalPriceUsd)}
            </span>
            <span className="ml-auto text-sm text-muted">{b.contactName}</span>
          </summary>

          <div className="mt-4 grid gap-6 text-sm md:grid-cols-3">
            <dl className="space-y-1">
              <dt className="font-semibold">Contact</dt>
              <dd>{b.contactName} · {b.country}</dd>
              <dd>{b.email}</dd>
              <dd>{b.phone} ({label("messenger", b.messenger)})</dd>
              <dd className="pt-2 font-semibold">Emergency</dd>
              <dd>{b.emergencyName} · {b.emergencyPhone}</dd>
            </dl>
            <dl className="space-y-1">
              <dt className="font-semibold">Experience</dt>
              <dd>Yurt: {label("yurtArrangement", b.yurtArrangement)}</dd>
              <dd>Fitness: {label("fitnessLevel", b.fitnessLevel)}</dd>
              <dd>Interests: {b.interests.map((i) => label("interests", i)).join(", ") || "—"}</dd>
              {b.occasion && <dd>Occasion: {b.occasion}</dd>}
              {b.medicalNotes && <dd className="text-red-700 dark:text-red-300">Health: {b.medicalNotes}</dd>}
            </dl>
            <dl className="space-y-1">
              <dt className="font-semibold">Logistics</dt>
              <dd>Arrival: {label("arrivalAirport", b.arrivalAirport)} {b.arrivalFlight && `· ${b.arrivalFlight}`}</dd>
              <dd>Pickup: {b.needsAirportPickup ? "Yes" : "No"}</dd>
              {b.specialRequests && <dd>Requests: {b.specialRequests}</dd>}
              {b.referralSource && <dd>Heard via: {b.referralSource}</dd>}
              <dd className="text-muted">Received {b.createdAt} UTC</dd>
            </dl>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 pr-4 font-medium">Traveler</th>
                  <th className="py-1 pr-4 font-medium">Born</th>
                  <th className="py-1 pr-4 font-medium">Nationality</th>
                  <th className="py-1 pr-4 font-medium">Diet</th>
                  <th className="py-1 pr-4 font-medium">Riding</th>
                  <th className="py-1 font-medium">Allergies</th>
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
                    <td className="py-1">{t.allergies ?? "—"}</td>
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
                  Confirm
                </button>
              )}
              <button name="status" value="cancelled" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent">
                Cancel booking
              </button>
            </form>
          )}
        </details>
      ))}
    </div>
  );
}

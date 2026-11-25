import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { getBookingByReference } from "@/lib/bookings";
import { addDays, formatDate, usd } from "@/lib/pricing";

export const metadata = { title: "Your booking", robots: { index: false } };

export default function BookingPage({ params }: PageProps<"/bookings/[reference]">) {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <BookingSummary params={params} />
    </Suspense>
  );
}

async function BookingSummary({ params }: { params: PageProps<"/bookings/[reference]">["params"] }) {
  await connection();
  const { reference } = await params;
  const data = /^NT-[A-Z2-9]{8}$/.test(reference) ? getBookingByReference(db, reference) : null;
  if (!data) notFound();
  const { booking, departure, trip, travelers } = data;

  // Shows only what the traveler needs to recognise the booking; contact and health details stay private.
  return (
    <div className="card mx-auto max-w-xl p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-gold">Booking request received</p>
      <h1 className="mt-2 text-2xl font-bold">Rakhmat, {booking.contactName.split(" ")[0]}!</h1>
      <p className="mt-2 text-muted">
        We&apos;ll confirm availability and send payment details within 24 hours via {booking.messenger === "email" ? "email" : booking.messenger}.
        Keep your reference:
      </p>
      <p className="mt-4 rounded-lg bg-accent/10 py-3 text-center font-mono text-xl font-bold tracking-wider text-accent">
        {booking.reference}
      </p>
      <dl className="mt-6 space-y-2 text-sm">
        <Item label="Status" value={<StatusBadge status={booking.status} />} />
        <Item label="Trip" value={trip.title} />
        <Item label="Dates" value={`${formatDate(departure.startDate)} – ${formatDate(addDays(departure.startDate, trip.durationDays - 1))}`} />
        <Item label="Travelers" value={travelers.map((t) => t.fullName).join(", ")} />
        <Item label="Yurt" value={booking.yurtArrangement === "private" ? "Private yurt" : "Shared yurt"} />
        <Item label="Estimated total" value={usd(booking.totalPriceUsd)} />
      </dl>
      <Link href="/" className="btn mt-8 w-full">
        Back to trips
      </Link>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

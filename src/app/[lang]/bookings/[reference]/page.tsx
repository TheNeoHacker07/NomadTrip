import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton, StatusBadge } from "@/components/ui";
import { db } from "@/db";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { getBookingByReference } from "@/lib/bookings";
import { addDays, formatDate, usd } from "@/lib/pricing";

export async function generateMetadata() {
  const { metaTitle } = await getDictionary("confirmation");
  return { title: metaTitle, robots: { index: false } };
}

export default function BookingPage({ params }: PageProps<"/[lang]/bookings/[reference]">) {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <BookingSummary params={params} />
    </Suspense>
  );
}

async function BookingSummary({ params }: { params: PageProps<"/[lang]/bookings/[reference]">["params"] }) {
  await connection();
  const { reference } = await params;
  const [lang, common, c] = await Promise.all([getLang(), getDictionary("common"), getDictionary("confirmation")]);
  const data = /^NT-[A-Z2-9]{8}$/.test(reference) ? getBookingByReference(db, reference) : null;
  if (!data) notFound();
  const { booking, departure, trip, travelers } = data;

  // Shows only what the traveler needs to recognise the booking; contact and health details stay private.
  return (
    <div className="card mx-auto max-w-xl p-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-gold">{c.eyebrow}</p>
      <h1 className="mt-2 text-2xl font-bold">{interpolate(c.thanks, { name: booking.contactName.split(" ")[0] })}</h1>
      <p className="mt-2 text-muted">{interpolate(c.body, { channel: c.channels[booking.messenger] })}</p>
      <p className="mt-4 rounded-lg bg-accent/10 py-3 text-center font-mono text-xl font-bold tracking-wider text-accent">
        {booking.reference}
      </p>
      <dl className="mt-6 space-y-2 text-sm">
        <Item label={c.status} value={<StatusBadge status={booking.status} label={common.status[booking.status]} />} />
        <Item label={c.trip} value={localize(trip.title, lang)} />
        <Item
          label={c.dates}
          value={`${formatDate(departure.startDate, lang)} – ${formatDate(addDays(departure.startDate, trip.durationDays - 1), lang)}`}
        />
        <Item label={c.travelers} value={travelers.map((t) => t.fullName).join(", ")} />
        <Item label={c.yurt} value={booking.yurtArrangement === "private" ? c.yurtPrivate : c.yurtShared} />
        <Item label={c.estimatedTotal} value={usd(booking.totalPriceUsd)} />
      </dl>
      <Link href={`/${lang}`} className="btn mt-8 w-full">
        {c.backToTrips}
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

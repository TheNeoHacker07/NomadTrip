import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { db } from "@/db";
import { getDeparture, today } from "@/lib/bookings";
import { addDays, formatDate } from "@/lib/pricing";
import { BookingForm } from "./booking-form";

export const metadata = { title: "Book your journey" };

export default function BookPage(props: PageProps<"/trips/[slug]/book">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <BookingContent {...props} />
    </Suspense>
  );
}

async function BookingContent({ params, searchParams }: PageProps<"/trips/[slug]/book">) {
  await connection();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const departureId = Number(sp.departure);
  const found = Number.isInteger(departureId) ? getDeparture(db, departureId) : null;
  if (!found || found.trip.slug !== slug) notFound();
  const { trip, departure, seatsLeft } = found;

  if (departure.startDate <= today() || seatsLeft === 0) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">This departure is no longer available</h1>
        <p className="mt-2 text-muted">It has either started or sold out.</p>
        <Link href={`/trips/${trip.slug}`} className="btn mt-6">
          See other dates
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/trips/${trip.slug}`} className="text-sm text-muted hover:text-foreground">
        ← {trip.title}
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Book your journey</h1>
      <p className="mt-2 text-muted">
        {trip.title} · {formatDate(departure.startDate)} – {formatDate(addDays(departure.startDate, trip.durationDays - 1))} ·{" "}
        {seatsLeft} seats left
      </p>
      <p className="mt-1 text-sm text-muted">
        The more we know about you, the better we can match your yurt, horses, meals and pace. Nothing is charged now —
        we confirm availability and send payment details within 24 hours.
      </p>
      <BookingForm
        departureId={departure.id}
        maxTravelers={seatsLeft}
        pricePerPersonUsd={trip.pricePerPersonUsd}
        durationDays={trip.durationDays}
      />
    </div>
  );
}

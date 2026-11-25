import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DifficultyBadge, Skeleton } from "@/components/ui";
import { db } from "@/db";
import { getTripWithDepartures } from "@/lib/bookings";
import { addDays, formatDate, usd } from "@/lib/pricing";

export default function TripPage({ params }: PageProps<"/trips/[slug]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TripDetails params={params} />
    </Suspense>
  );
}

async function TripDetails({ params }: { params: PageProps<"/trips/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const data = getTripWithDepartures(db, slug);
  if (!data) notFound();
  const { trip, departures } = data;

  return (
    <article className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-2 flex items-center gap-3 text-sm text-muted">
          <span>
            {trip.durationDays} days · {trip.region}
          </span>
          <DifficultyBadge level={trip.difficulty} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{trip.title}</h1>
        <p className="mt-4 text-muted">{trip.description}</p>

        <ul className="mt-6 flex flex-wrap gap-2">
          {trip.highlights.map((h) => (
            <li key={h} className="rounded-full border border-border px-3 py-1 text-sm">
              {h}
            </li>
          ))}
        </ul>

        <h2 className="mt-10 mb-4 text-xl font-semibold">Day by day</h2>
        <ol className="space-y-3">
          {trip.itinerary.map((d) => (
            <li key={d.day} className="card flex gap-4 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {d.day}
              </span>
              <div>
                <h3 className="font-medium">{d.title}</h3>
                <p className="text-sm text-muted">{d.description}</p>
                <p className="mt-1 text-xs text-muted">Overnight: {d.overnight}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <p className="text-sm text-muted">Price per person</p>
          <p className="text-3xl font-bold">{usd(trip.pricePerPersonUsd)}</p>
          <p className="mt-1 text-xs text-muted">Includes yurt stays, meals, guide and transport in Kyrgyzstan.</p>
          <h2 className="mt-5 mb-2 text-sm font-semibold">Upcoming departures</h2>
          {departures.length === 0 ? (
            <p className="text-sm text-muted">No scheduled departures — contact us for a private date.</p>
          ) : (
            <ul className="space-y-2">
              {departures.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {formatDate(d.startDate)} – {formatDate(addDays(d.startDate, trip.durationDays - 1))}
                    </p>
                    <p className="text-xs text-muted">{d.seatsLeft > 0 ? `${d.seatsLeft} seats left` : "Fully booked"}</p>
                  </div>
                  {d.seatsLeft > 0 && (
                    <Link href={`/trips/${trip.slug}/book?departure=${d.id}`} className="btn px-3 py-1.5">
                      Book
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </article>
  );
}

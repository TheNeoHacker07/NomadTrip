import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { db } from "@/db";
import { tripRegions } from "@/db/schema";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, plural } from "@/i18n/format";
import { getTripAdmin, MAX_CAPACITY } from "@/lib/admin";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { formatDate } from "@/lib/pricing";
import { addDepartureAction, deleteDepartureAction, setCapacityAction } from "../../actions";
import { ActionForm } from "../../action-form";
import { TripForm } from "../../trip-form";
import { formMessages, tripFormLabels } from "../form-props";

export async function generateMetadata() {
  const { trips } = await getDictionary("admin");
  return { title: trips.metaTitle, robots: { index: false } };
}

export default async function EditTripPage({ params }: PageProps<"/[lang]/admin/trips/[id]">) {
  const a = await getDictionary("admin");
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <EditTrip params={params} back={a.form.back} />
    </Suspense>
  );
}

async function EditTrip({ params, back }: { params: PageProps<"/[lang]/admin/trips/[id]">["params"]; back: string }) {
  const [lang, common, a] = await Promise.all([getLang(), getDictionary("common"), getDictionary("admin")]);
  if (!isAdminAuthorization((await headers()).get("authorization"))) return <p className="text-muted">{a.unauthorized}</p>;
  await connection();
  const { id } = await params;
  const tripId = Number(id);
  const data = Number.isInteger(tripId) && tripId > 0 ? getTripAdmin(db, tripId) : null;
  if (!data) notFound();
  const { trip, departures } = data;
  const messages = formMessages(a);

  const byLocale = <T,>(pick: (l: "en" | "ru" | "ky") => T) => ({ en: pick("en"), ru: pick("ru"), ky: pick("ky") });
  const days = trip.itinerary.en.map((_, i) => ({
    title: byLocale((l) => trip.itinerary[l][i]?.title ?? ""),
    description: byLocale((l) => trip.itinerary[l][i]?.description ?? ""),
    overnight: byLocale((l) => trip.itinerary[l][i]?.overnight ?? ""),
  }));

  return (
    <div className="space-y-10">
      <div>
        <Link href={`/${lang}/admin/trips`} className="text-sm text-muted hover:text-foreground">← {back}</Link>
        <h1 className="mt-2 text-2xl font-bold">{a.form.editTitle}</h1>
        <p className="text-sm text-muted">
          {a.form.durationNow}: {plural(a.days, trip.durationDays, lang)} · <span className="font-mono">{trip.slug}</span>
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{a.departures.title}</h2>
        {departures.length === 0 ? (
          <p className="text-muted">{a.departures.none}</p>
        ) : (
          <div className="card divide-y divide-border">
            {departures.map((d) => (
              <div key={d.id} className="flex flex-wrap items-start gap-x-6 gap-y-2 p-4 text-sm">
                <div className="w-40">
                  <div className="font-medium">{formatDate(d.startDate, lang)}</div>
                  <div className="text-muted">
                    {a.departures.taken}: {interpolate(a.departures.seats, { taken: d.taken, capacity: d.capacity })}
                  </div>
                  {d.bookingCount > 0 && <div className="text-muted">{interpolate(a.departures.bookingsCount, { count: d.bookingCount })}</div>}
                </div>
                <ActionForm action={setCapacityAction} messages={messages} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="departureId" value={d.id} />
                  <label className="sr-only" htmlFor={`cap-${d.id}`}>{a.departures.capacity}</label>
                  <input
                    id={`cap-${d.id}`} name="capacity" type="number" min={Math.max(1, d.taken)} max={MAX_CAPACITY}
                    defaultValue={d.capacity} required className="field w-24"
                  />
                  <button className="rounded-lg border border-border px-3 py-1.5 hover:border-accent">{a.departures.update}</button>
                </ActionForm>
                {d.bookingCount === 0 ? (
                  <ActionForm action={deleteDepartureAction} messages={messages} className="ml-auto" showSaved={false}>
                    <input type="hidden" name="departureId" value={d.id} />
                    <button className="rounded-lg border border-border px-3 py-1.5 text-red-700 hover:border-red-500 dark:text-red-300">
                      {a.departures.delete}
                    </button>
                  </ActionForm>
                ) : (
                  <span className="ml-auto text-xs text-muted">{a.departures.deleteHint}</span>
                )}
              </div>
            ))}
          </div>
        )}

        <ActionForm action={addDepartureAction} messages={messages} className="card flex flex-wrap items-end gap-3 p-4 text-sm">
          <input type="hidden" name="tripId" value={trip.id} />
          <h3 className="w-full font-semibold">{a.departures.addTitle}</h3>
          <div>
            <label className="label" htmlFor="new-start">{a.departures.start}</label>
            <input id="new-start" name="startDate" type="date" required className="field" />
          </div>
          <div>
            <label className="label" htmlFor="new-cap">{a.departures.capacity}</label>
            <input id="new-cap" name="capacity" type="number" min={1} max={MAX_CAPACITY} defaultValue={8} required className="field w-24" />
          </div>
          <button className="btn px-4 py-2">{a.departures.add}</button>
        </ActionForm>
      </section>

      <TripForm
        lang={lang}
        tripId={trip.id}
        initial={{
          slug: trip.slug,
          pricePerPersonUsd: trip.pricePerPersonUsd,
          difficulty: trip.difficulty,
          region: trip.region,
          title: trip.title,
          summary: trip.summary,
          description: trip.description,
          highlights: byLocale((l) => trip.highlights[l].join("\n")),
          itinerary: days,
        }}
        labels={tripFormLabels(a, common, a.form.save)}
        messages={messages}
        regions={tripRegions}
        difficulties={["easy", "moderate", "challenging"]}
      />
    </div>
  );
}

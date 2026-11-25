import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { db } from "@/db";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { languageAlternates, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { getDeparture, today } from "@/lib/bookings";
import { addDays, formatDate } from "@/lib/pricing";
import { BookingForm } from "./booking-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/trips/[slug]/book">): Promise<Metadata> {
  const { slug } = await params;
  const { metaTitle } = await getDictionary("booking");
  return { title: metaTitle, alternates: { languages: languageAlternates(`/trips/${slug}/book`, locales) } };
}

export default function BookPage(props: PageProps<"/[lang]/trips/[slug]/book">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <BookingContent {...props} />
    </Suspense>
  );
}

async function BookingContent({ params, searchParams }: PageProps<"/[lang]/trips/[slug]/book">) {
  await connection();
  const [{ slug }, sp, lang, common, dict] = await Promise.all([
    params,
    searchParams,
    getLang(),
    getDictionary("common"),
    getDictionary("booking"),
  ]);
  const departureId = Number(sp.departure);
  const found = Number.isInteger(departureId) ? getDeparture(db, departureId) : null;
  if (!found || found.trip.slug !== slug) notFound();
  const { trip, departure, seatsLeft } = found;
  const title = localize(trip.title, lang);

  if (departure.startDate <= today() || seatsLeft === 0) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">{dict.unavailableTitle}</h1>
        <p className="mt-2 text-muted">{dict.unavailableText}</p>
        <Link href={`/${lang}/trips/${trip.slug}`} className="btn mt-6">
          {dict.seeOtherDates}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/${lang}/trips/${trip.slug}`} className="text-sm text-muted hover:text-foreground">
        ← {title}
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{dict.title}</h1>
      <p className="mt-2 text-muted">
        {title} · {formatDate(departure.startDate, lang)} – {formatDate(addDays(departure.startDate, trip.durationDays - 1), lang)} ·{" "}
        {plural(common.ui.seatsLeft, seatsLeft, lang)}
      </p>
      <p className="mt-1 text-sm text-muted">{dict.intro}</p>
      <BookingForm
        lang={lang}
        dict={{
          sections: dict.sections,
          fields: dict.fields,
          summary: dict.summary,
          options: dict.options,
          errors: dict.errors,
          messages: dict.messages,
        }}
        departureId={departure.id}
        maxTravelers={seatsLeft}
        pricePerPersonUsd={trip.pricePerPersonUsd}
        durationDays={trip.durationDays}
      />
    </div>
  );
}

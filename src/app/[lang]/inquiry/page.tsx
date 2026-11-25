import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { db } from "@/db";
import { locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, languageAlternates } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { listTrips } from "@/lib/bookings";
import { InquiryForm } from "./inquiry-form";

export async function generateMetadata(): Promise<Metadata> {
  const { metaTitle } = await getDictionary("inquiry");
  return { title: metaTitle, alternates: { languages: languageAlternates("/inquiry", locales) } };
}

export default function InquiryPage({ searchParams }: PageProps<"/[lang]/inquiry">) {
  return (
    <Suspense fallback={<Skeleton className="h-[600px]" />}>
      <InquiryContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InquiryContent({ searchParams }: { searchParams: PageProps<"/[lang]/inquiry">["searchParams"] }) {
  await connection();
  const [sp, lang, dict, booking] = await Promise.all([searchParams, getLang(), getDictionary("inquiry"), getDictionary("booking")]);
  const trips = listTrips(db).map((t) => ({ id: t.id, slug: t.slug, title: localize(t.title, lang) }));
  const slug = typeof sp.trip === "string" ? sp.trip : undefined;
  const selected = slug ? trips.find((t) => t.slug === slug) : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">{dict.title}</h1>
      <p className="mt-2 text-muted">{dict.intro}</p>
      {selected && <p className="mt-1 text-sm font-medium">{interpolate(dict.aboutTrip, { trip: selected.title })}</p>}
      <div className="mt-6">
        <InquiryForm
          lang={lang}
          dict={dict}
          messengers={booking.options.messenger}
          trips={trips.map(({ id, title }) => ({ id, title }))}
          initialTripId={selected?.id ?? null}
        />
      </div>
    </div>
  );
}

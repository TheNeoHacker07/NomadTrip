import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { db } from "@/db";
import { intlLocale, locales } from "@/i18n/config";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate, languageAlternates, plural } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { today } from "@/lib/bookings";
import { groupByMonth, listUpcomingDepartures, monthsOf, parseMonth } from "@/lib/departures";
import { formatDate, usd } from "@/lib/pricing";
import type { SearchParams } from "@/lib/trip-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary("discover");
  return {
    title: t.departures.metaTitle,
    description: t.departures.metaDescription,
    alternates: { languages: languageAlternates("/departures", locales) },
  };
}

export default function DeparturesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <DepartureList searchParams={searchParams} />
    </Suspense>
  );
}

async function DepartureList({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const [params, lang, common, d] = await Promise.all([searchParams, getLang(), getDictionary("common"), getDictionary("discover")]);
  const t = d.departures;
  const month = parseMonth(params.month);
  const all = listUpcomingDepartures(db, today());
  const months = monthsOf(all);
  const groups = groupByMonth(month ? all.filter((r) => r.startDate.startsWith(`${month}-`)) : all);
  const monthName = (m: string) =>
    new Intl.DateTimeFormat(intlLocale[lang], { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-2 mb-6 text-muted">{t.intro}</p>
      <form method="get" action={`/${lang}/departures`} className="card mb-8 flex flex-wrap items-end gap-4 p-5" aria-label={t.monthFilter}>
        <div>
          <label htmlFor="d-month" className="label">{t.monthFilter}</label>
          <select id="d-month" name="month" defaultValue={month ?? ""} className="field">
            <option value="">{t.allMonths}</option>
            {months.map((m) => (
              <option key={m} value={m}>{monthName(m)}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">{t.apply}</button>
      </form>

      {groups.length === 0 ? (
        <div className="card p-8 text-center text-muted">{t.empty}</div>
      ) : (
        groups.map((g) => (
          <section key={g.month} className="mb-8" aria-labelledby={`m-${g.month}`}>
            <h2 id={`m-${g.month}`} className="mb-3 text-xl font-semibold capitalize">{monthName(g.month)}</h2>
            <ul className="space-y-2">
              {g.departures.map((r) => (
                <li key={r.id} data-departure-id={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">
                      {formatDate(r.startDate, lang)} – {formatDate(r.endDate, lang)}
                    </p>
                    <p className="mt-1">
                      <Link href={`/${lang}/trips/${r.trip.slug}`} className="font-semibold hover:text-accent">
                        {localize(r.trip.title, lang)}
                      </Link>
                    </p>
                    <p className="text-sm text-muted">
                      {plural(common.ui.days, r.trip.durationDays, lang)} · {interpolate(t.pricePerPerson, { price: usd(r.trip.pricePerPersonUsd) })} ·{" "}
                      {r.seatsLeft > 0 ? plural(common.ui.seatsLeft, r.seatsLeft, lang) : common.ui.fullyBooked}
                    </p>
                  </div>
                  {r.seatsLeft > 0 && (
                    <Link href={`/${lang}/trips/${r.trip.slug}/book?departure=${r.id}`} className="btn px-3 py-1.5">
                      {t.book}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

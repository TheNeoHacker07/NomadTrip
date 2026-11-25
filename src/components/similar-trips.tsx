import Link from "next/link";
import { Photo } from "@/components/photo";
import { db } from "@/db";
import type { Trip } from "@/db/schema";
import { getDictionary, getLang } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { listTrips } from "@/lib/bookings";
import { tripCover } from "@/lib/images";
import { usd } from "@/lib/pricing";
import { rankSimilar } from "@/lib/similar";

/** "You might also like": up to 3 other trips (same region, then closest duration and price). Call after `connection()`. */
export async function SimilarTrips({ trip }: { trip: Trip }) {
  const [lang, common, home, t] = await Promise.all([getLang(), getDictionary("common"), getDictionary("home"), getDictionary("discover")]);
  const similar = rankSimilar(trip, listTrips(db));
  if (similar.length === 0) return null;
  return (
    <section className="mt-12 lg:col-span-2" aria-labelledby="similar-trips">
      <h2 id="similar-trips" className="mb-4 text-xl font-semibold">{t.similar.title}</h2>
      <ul className="grid gap-4 sm:grid-cols-3" data-testid="similar-trips">
        {similar.map((s) => (
          <li key={s.id}>
            <Link href={`/${lang}/trips/${s.slug}`} className="card group flex h-full flex-col overflow-hidden transition hover:border-accent">
              <Photo name={tripCover(s.slug, s.region)} sizes="(min-width: 640px) 33vw, 100vw" frame="aspect-[16/9]" linkCredit={false} className="[&>div]:rounded-none [&>figcaption]:px-4 [&>figcaption]:pb-1" />
              <div className="p-4 pt-2">
                <p className="text-xs text-muted">{common.regions[s.region]}</p>
                <h3 className="font-semibold group-hover:text-accent">{localize(s.title, lang)}</h3>
                <p className="mt-1 text-sm">{interpolate(home.priceFrom, { price: usd(s.pricePerPersonUsd) })}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

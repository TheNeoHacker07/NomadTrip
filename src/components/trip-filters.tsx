import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionaries } from "@/i18n/dictionaries";
import { durationBuckets, hasActiveFilters, tripSorts, type TripFilters } from "@/lib/trip-search";
import { tripRegions } from "@/db/schema";

/** Plain GET form: works without JavaScript, values round-trip through the URL. */
export function TripFiltersForm({
  lang,
  filters,
  t,
  regionLabels,
}: {
  lang: Locale;
  filters: TripFilters;
  t: Dictionaries["filters"];
  regionLabels: Dictionaries["common"]["regions"];
}) {
  return (
    // Keyed by the active filters: inputs use defaultValue, which only applies on mount, so a
    // client-side navigation (e.g. "Clear filters") must remount the form to show the new values.
    <form key={JSON.stringify(filters)} method="get" action={`/${lang}`} className="card mb-6 grid gap-4 border-t-4 border-t-primary p-5 sm:grid-cols-2 lg:grid-cols-4" aria-label={t.title}>
      <div>
        <label htmlFor="f-region" className="label">{t.region}</label>
        <select id="f-region" name="region" defaultValue={filters.region ?? ""} className="field">
          <option value="">{t.anyRegion}</option>
          {tripRegions.map((r) => (
            <option key={r} value={r}>{regionLabels[r]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-duration" className="label">{t.duration}</label>
        <select id="f-duration" name="duration" defaultValue={filters.duration ?? ""} className="field">
          <option value="">{t.anyDuration}</option>
          {durationBuckets.map((d) => (
            <option key={d} value={d}>{t.durations[d]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="f-priceMin" className="label">{t.priceMin}</label>
        <input id="f-priceMin" name="priceMin" type="number" min={0} step={1} inputMode="numeric" defaultValue={filters.priceMin ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="f-priceMax" className="label">{t.priceMax}</label>
        <input id="f-priceMax" name="priceMax" type="number" min={0} step={1} inputMode="numeric" defaultValue={filters.priceMax ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="f-from" className="label">{t.from}</label>
        <input id="f-from" name="from" type="date" defaultValue={filters.from ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="f-to" className="label">{t.to}</label>
        <input id="f-to" name="to" type="date" defaultValue={filters.to ?? ""} className="field" />
      </div>
      <div>
        <label htmlFor="f-sort" className="label">{t.sort}</label>
        <select id="f-sort" name="sort" defaultValue={filters.sort} className="field">
          {tripSorts.map((s) => (
            <option key={s} value={s}>{t.sorts[s]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-3">
        <button type="submit" className="btn">{t.apply}</button>
        {hasActiveFilters(filters) || filters.sort !== "soonest" ? (
          <Link href={`/${lang}#trips`} className="text-sm text-muted underline underline-offset-4 hover:text-accent">{t.clear}</Link>
        ) : null}
      </div>
    </form>
  );
}

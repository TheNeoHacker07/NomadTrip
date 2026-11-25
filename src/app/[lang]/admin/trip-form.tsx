"use client";

import { useState } from "react";
import type { TripInput } from "@/lib/admin";
import { saveTrip } from "./actions";
import { ActionForm, type FormMessages } from "./action-form";

type Lang = "en" | "ru" | "ky";
const LANGS: readonly Lang[] = ["en", "ru", "ky"];

export type TripFormLabels = {
  slug: string; slugHint: string; price: string; difficulty: string; region: string; title: string; summary: string;
  description: string; highlights: string; highlightsHint: string; itinerary: string; itineraryHint: string; day: string;
  dayTitle: string; dayDescription: string; overnight: string; addDay: string; removeDay: string; general: string;
  submit: string; difficulties: Record<string, string>; regions: Record<string, string>;
};

type Day = TripInput["itinerary"][number];
const blankLocalized = { en: "", ru: "", ky: "" };
const blankDay = (): Day => ({ title: { ...blankLocalized }, description: { ...blankLocalized }, overnight: { ...blankLocalized } });

export type TripFormValues = Omit<TripInput, "highlights" | "pricePerPersonUsd"> & {
  highlights: Record<Lang, string>; // one per line
  pricePerPersonUsd: number | "";
};

export function TripForm({
  lang, tripId, initial, labels, messages, regions, difficulties,
}: {
  lang: string;
  tripId?: number;
  initial: TripFormValues;
  labels: TripFormLabels;
  messages: FormMessages;
  regions: readonly string[];
  difficulties: readonly string[];
}) {
  // Stable keys keep each row's uncontrolled inputs attached to the right row when one is removed.
  const [days, setDays] = useState(() => initial.itinerary.map((d, i) => ({ key: i, day: d })));
  const [nextKey, setNextKey] = useState(initial.itinerary.length);

  const setDayField = (key: number, field: keyof Day, l: Lang, value: string) =>
    setDays((ds) => ds.map((x) => (x.key === key ? { ...x, day: { ...x.day, [field]: { ...x.day[field], [l]: value } } } : x)));

  // `onChange` makes the textareas controlled (itinerary days), so the state always matches what was typed and saved.
  const localized = (
    name: string, label: string, values: Record<Lang, string>, rows: number,
    onChange?: (l: Lang, value: string) => void,
  ) => (
    <fieldset className="space-y-2">
      <legend className="label">{label}</legend>
      {LANGS.map((l) => (
        <div key={l} className="flex items-start gap-2">
          <span className="mt-2 w-7 text-xs font-semibold text-muted">{l.toUpperCase()}</span>
          {onChange ? (
            <textarea name={`${name}.${l}`} value={values[l]} onChange={(e) => onChange(l, e.target.value)} rows={rows} required lang={l} className="field" />
          ) : (
            <textarea name={`${name}.${l}`} defaultValue={values[l]} rows={rows} required lang={l} className="field" />
          )}
        </div>
      ))}
    </fieldset>
  );

  return (
    <ActionForm action={saveTrip} messages={messages} className="space-y-8">
      <input type="hidden" name="lang" value={lang} />
      {tripId !== undefined && <input type="hidden" name="id" value={tripId} />}

      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-lg font-semibold md:col-span-2">{labels.general}</h2>
        <div>
          <label className="label" htmlFor="slug">{labels.slug}</label>
          <input id="slug" name="slug" defaultValue={initial.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="field" />
          <p className="mt-1 text-xs text-muted">{labels.slugHint}</p>
        </div>
        <div>
          <label className="label" htmlFor="price">{labels.price}</label>
          <input id="price" name="pricePerPersonUsd" type="number" min={1} step={1} defaultValue={initial.pricePerPersonUsd} required className="field" />
        </div>
        <div>
          <label className="label" htmlFor="difficulty">{labels.difficulty}</label>
          <select id="difficulty" name="difficulty" defaultValue={initial.difficulty} className="field">
            {difficulties.map((d) => <option key={d} value={d}>{labels.difficulties[d]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="region">{labels.region}</label>
          <select id="region" name="region" defaultValue={initial.region} className="field">
            {regions.map((r) => <option key={r} value={r}>{labels.regions[r]}</option>)}
          </select>
        </div>
      </section>

      <section className="card space-y-5 p-5">
        {localized("title", labels.title, initial.title, 1)}
        {localized("summary", labels.summary, initial.summary, 2)}
        {localized("description", labels.description, initial.description, 5)}
        {localized("highlights", `${labels.highlights} — ${labels.highlightsHint}`, initial.highlights, 4)}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{labels.itinerary}</h2>
          <p className="text-sm text-muted">{labels.itineraryHint}</p>
        </div>
        {days.map(({ key, day }, i) => (
          <div key={key} className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{labels.day} {i + 1}</h3>
              <button
                type="button"
                onClick={() => setDays((d) => d.filter((x) => x.key !== key))}
                className="rounded-lg border border-border px-3 py-1 text-sm hover:border-accent"
              >
                {labels.removeDay}
              </button>
            </div>
            {localized(`day.${i}.title`, labels.dayTitle, day.title, 1, (l, v) => setDayField(key, "title", l, v))}
            {localized(`day.${i}.description`, labels.dayDescription, day.description, 3, (l, v) => setDayField(key, "description", l, v))}
            {localized(`day.${i}.overnight`, labels.overnight, day.overnight, 1, (l, v) => setDayField(key, "overnight", l, v))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setDays((d) => [...d, { key: nextKey, day: blankDay() }]);
            setNextKey((k) => k + 1);
          }}
          className="rounded-lg border border-dashed border-border px-4 py-2 text-sm hover:border-accent"
        >
          {labels.addDay}
        </button>
      </section>

      <button className="btn">{labels.submit}</button>
    </ActionForm>
  );
}

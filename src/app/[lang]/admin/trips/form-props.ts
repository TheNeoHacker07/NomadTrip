import type { Dictionaries } from "@/i18n/dictionaries";
import type { FormMessages } from "../action-form";
import type { TripFormLabels } from "../trip-form";

export function tripFormLabels(a: Dictionaries["admin"], common: Dictionaries["common"], submit: string): TripFormLabels {
  const { form } = a;
  return {
    slug: form.slug, slugHint: form.slugHint, price: form.price, difficulty: form.difficulty, region: form.region,
    title: form.title, summary: form.summary, description: form.description, highlights: form.highlights,
    highlightsHint: form.highlightsHint, itinerary: form.itinerary,
    itineraryHint: form.itineraryHint.replace("{min}", "2").replace("{max}", "30"),
    day: form.day, dayTitle: form.dayTitle, dayDescription: form.dayDescription, overnight: form.overnight,
    addDay: form.addDay, removeDay: form.removeDay, general: form.general, submit,
    difficulties: common.difficulty, regions: common.regions,
  };
}

export function formMessages(a: Dictionaries["admin"]): FormMessages {
  return {
    errors: a.errors,
    day: a.form.day,
    saved: a.form.saved,
    fields: {
      slug: a.form.slug, pricePerPersonUsd: a.form.price, difficulty: a.form.difficulty, region: a.form.region,
      title: a.form.title, summary: a.form.summary, description: a.form.description, highlights: a.form.highlights,
      itinerary: a.form.itinerary, capacity: a.departures.capacity, startDate: a.departures.start,
      dayTitle: a.form.dayTitle, dayDescription: a.form.dayDescription, overnight: a.form.overnight,
    },
  };
}

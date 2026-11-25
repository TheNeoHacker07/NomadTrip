import type { Locale } from "@/i18n/config";
import { localize } from "@/i18n/localize";
import type { ItineraryDay, trips } from "@/db/schema";

type Trip = typeof trips.$inferSelect;
export type TripOffer = { id: number; startDate: string; seatsLeft: number };

/** JSON for an inline <script type="application/ld+json">: `<` is escaped so content can never close the tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export function buildTripJsonLd(opts: { trip: Trip; lang: Locale; origin: string; imageUrl: string; offers: TripOffer[] }) {
  const { trip, lang, origin, imageUrl, offers } = opts;
  const url = `${origin}/${lang}/trips/${trip.slug}`;
  const days: ItineraryDay[] = localize(trip.itinerary, lang);
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: localize(trip.title, lang),
    description: localize(trip.description, lang),
    url,
    inLanguage: lang,
    image: imageUrl,
    touristType: localize(trip.highlights, lang).join(", "),
    itinerary: {
      "@type": "ItemList",
      numberOfItems: days.length,
      itemListElement: days.map((d) => ({
        "@type": "ListItem",
        position: d.day,
        item: { "@type": "Place", name: d.title, description: d.description },
      })),
    },
    offers: offers.map((o) => ({
      "@type": "Offer",
      url: `${origin}/${lang}/trips/${trip.slug}/book?departure=${o.id}`,
      price: trip.pricePerPersonUsd,
      priceCurrency: "USD",
      availability: o.seatsLeft > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      validFrom: o.startDate,
    })),
  };
}

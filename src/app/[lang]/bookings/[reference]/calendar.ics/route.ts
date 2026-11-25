import { connection, type NextRequest } from "next/server";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import { localize } from "@/i18n/localize";
import { getBookingByReference } from "@/lib/bookings";
import { buildIcs } from "@/lib/ics";

const REFERENCE_RE = /^NT-[A-Z2-9]{8}$/;
const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

// The reference is the capability (same as the confirmation page). The event carries no contact or health data.
export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string; reference: string }> }) {
  await connection();
  const { lang, reference } = await params;
  if (!isLocale(lang) || !REFERENCE_RE.test(reference)) return notFound();
  const data = getBookingByReference(db, reference);
  if (!data || data.booking.status === "cancelled") return notFound();
  const { trip, departure } = data;
  const m = await getDictionary("manage", lang);

  const body = buildIcs({
    uid: `${reference}@nomadtrip`,
    summary: localize(trip.title, lang),
    description: interpolate(m.calendarDescription, { reference, url: `${request.nextUrl.origin}/${lang}/trips/${trip.slug}` }),
    startDate: departure.startDate,
    durationDays: trip.durationDays,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomadtrip-${reference}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

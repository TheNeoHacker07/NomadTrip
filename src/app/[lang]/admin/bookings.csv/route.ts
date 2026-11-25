import { connection, type NextRequest } from "next/server";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localize } from "@/i18n/localize";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { listBookingsFiltered, parseBookingFilters } from "@/lib/admin";
import { buildCsv } from "@/lib/csv";
import { addDays } from "@/lib/pricing";

const noStore = { "Cache-Control": "no-store" };

// The proxy skips paths with a file extension, so this handler does its own admin check.
export async function GET(request: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  if (!isAdminAuthorization(request.headers.get("authorization"))) {
    return new Response("Authentication required", {
      status: 401,
      headers: { ...noStore, "WWW-Authenticate": 'Basic realm="NomadTrip admin", charset="UTF-8"' },
    });
  }
  await connection();
  const { lang } = await params;
  if (!isLocale(lang)) return new Response("Not found", { status: 404, headers: noStore });
  const a = await getDictionary("admin", lang);
  const c = a.csv.columns;

  const filters = parseBookingFilters(Object.fromEntries(request.nextUrl.searchParams));
  const rows = listBookingsFiltered(db, filters).map(({ booking: b, departure, trip, travelers }) => [
    b.reference,
    b.status,
    b.createdAt,
    localize(trip.title, lang),
    departure.startDate,
    addDays(departure.startDate, trip.durationDays - 1),
    b.travelerCount,
    travelers.map((t) => t.fullName).join("; "),
    b.contactName,
    b.email,
    b.phone,
    b.messenger,
    b.country,
    b.yurtArrangement,
    b.totalPriceUsd,
    b.needsAirportPickup ? a.yes : a.no,
    b.arrivalAirport,
    b.arrivalFlight,
  ]);
  const header = [
    c.reference, c.status, c.created, c.trip, c.start, c.end, c.travelerCount, c.travelerNames, c.contact,
    c.email, c.phone, c.messenger, c.country, c.yurt, c.total, c.pickup, c.airport, c.flight,
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buildCsv(header, rows), {
    headers: {
      ...noStore,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomadtrip-bookings-${stamp}.csv"`,
    },
  });
}

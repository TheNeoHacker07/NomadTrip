import type { Db } from "@/db";
import type { BookingStatus } from "@/db/schema";
import type { Localized } from "@/i18n/localize";
import { getBookingByReference } from "./bookings";

const REFERENCE_RE = /^NT-[A-Z2-9]{8}$/;

/** "nt 2abc-d3fg" -> "NT-2ABCD3FG": trims, drops spaces/hyphens, upper-cases, restores the `NT-` prefix. */
export function normalizeReference(raw: string): string {
  const compact = raw.replace(/[\s-]+/g, "").toUpperCase();
  return compact.startsWith("NT") ? `NT-${compact.slice(2)}` : compact;
}

export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

/**
 * Everything the traveler may see after proving they hold both the reference and the email.
 * Deliberately a whitelist: no phone, email, medical notes, emergency contact or other bookings' data.
 */
export type ManageBookingView = {
  reference: string;
  status: BookingStatus;
  tripSlug: string;
  tripTitle: Localized<string>;
  startDate: string;
  durationDays: number;
  travelerNames: string[];
  yurtArrangement: "shared" | "private";
  totalPriceUsd: number;
  pickup: { needed: boolean; airport: "FRU" | "OSS" | "other"; flight: string | null };
};

/** Returns the booking only when the reference exists AND the email matches (case-insensitive); otherwise null, indistinguishably. */
export function lookupBooking(db: Db, referenceInput: string, emailInput: string): ManageBookingView | null {
  const reference = normalizeReference(referenceInput);
  const email = normalizeEmail(emailInput);
  const found = REFERENCE_RE.test(reference) ? getBookingByReference(db, reference) : null;
  if (!found || !email || normalizeEmail(found.booking.email) !== email) return null;
  const { booking, departure, trip, travelers } = found;
  return {
    reference: booking.reference,
    status: booking.status,
    tripSlug: trip.slug,
    tripTitle: trip.title,
    startDate: departure.startDate,
    durationDays: trip.durationDays,
    travelerNames: travelers.map((t) => t.fullName),
    yurtArrangement: booking.yurtArrangement,
    totalPriceUsd: booking.totalPriceUsd,
    pickup: { needed: booking.needsAirportPickup, airport: booking.arrivalAirport, flight: booking.arrivalFlight },
  };
}

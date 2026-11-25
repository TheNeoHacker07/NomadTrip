"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { bookingInputSchema, formDataToBookingInput, toFieldErrors, type FieldErrors } from "@/lib/booking-input";
import { createBooking } from "@/lib/bookings";

/** Codes the client translates via `booking.messages`; `not_enough_seats` also carries `seatsLeft`. */
export type BookingMessage =
  | { code: "check_fields" | "invalid_submission" | "departure_not_found" | "departure_closed" | "sold_out" }
  | { code: "not_enough_seats"; seatsLeft: number };

export type BookingFormState = { errors: FieldErrors; message?: BookingMessage };

export async function submitBooking(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  // Server actions are public endpoints: never assume the client sent a real form.
  if (!(formData instanceof FormData)) return { errors: {}, message: { code: "invalid_submission" } };
  // Root params are unavailable in Server Actions, so the form posts its locale; it is validated before use.
  const lang = formData.get("lang");
  if (!isLocale(lang)) return { errors: {}, message: { code: "invalid_submission" } };

  const parsed = bookingInputSchema.safeParse(formDataToBookingInput(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), message: { code: "check_fields" } };

  const result = createBooking(db, parsed.data);
  if (!result.ok) {
    if (result.error === "not_enough_seats") {
      const seatsLeft = result.seatsLeft ?? 0;
      return { errors: {}, message: seatsLeft === 0 ? { code: "sold_out" } : { code: "not_enough_seats", seatsLeft } };
    }
    return { errors: {}, message: { code: result.error } };
  }
  redirect(`/${lang}/bookings/${result.reference}`);
}

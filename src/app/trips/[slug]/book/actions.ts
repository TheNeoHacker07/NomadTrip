"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookingInputSchema, formDataToBookingInput, toFieldErrors, type FieldErrors } from "@/lib/booking-input";
import { createBooking } from "@/lib/bookings";

export type BookingFormState = { errors: FieldErrors; message?: string };

export async function submitBooking(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  // Server actions are public endpoints: never assume the client sent a real form.
  if (!(formData instanceof FormData)) return { errors: {}, message: "Invalid submission." };
  const parsed = bookingInputSchema.safeParse(formDataToBookingInput(formData));
  if (!parsed.success) {
    return { errors: toFieldErrors(parsed.error), message: "Please check the highlighted fields." };
  }

  const result = createBooking(db, parsed.data);
  if (!result.ok) {
    const message = {
      departure_not_found: "This departure no longer exists. Please pick another date.",
      departure_closed: "This departure has already started. Please pick another date.",
      not_enough_seats:
        result.seatsLeft === 0
          ? "Sorry — this departure just sold out. Please pick another date."
          : `Only ${result.seatsLeft} seat(s) left on this departure. Reduce travelers or pick another date.`,
    }[result.error];
    return { errors: {}, message };
  }

  redirect(`/bookings/${result.reference}`);
}

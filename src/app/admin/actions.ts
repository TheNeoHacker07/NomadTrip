"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { isAdminAuthorization } from "@/lib/admin-auth";
import { setBookingStatus } from "@/lib/bookings";

const schema = z.object({ bookingId: z.coerce.number().int().positive(), status: z.enum(["confirmed", "cancelled"]) });

export async function updateBookingStatus(formData: FormData) {
  if (!isAdminAuthorization((await headers()).get("authorization"))) throw new Error("Unauthorized");
  const { bookingId, status } = schema.parse(Object.fromEntries(formData));
  setBookingStatus(db, bookingId, status);
  refresh();
}

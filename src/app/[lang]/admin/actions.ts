"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { isLocale } from "@/i18n/config";
import { isAdminAuthorization } from "@/lib/admin-auth";
import {
  addDeparture,
  createTrip,
  deleteDeparture,
  formDataToTripInput,
  tripInputSchema,
  tripIssues,
  updateDepartureCapacity,
  updateTrip,
  type DepartureResult,
} from "@/lib/admin";
import { setBookingStatus } from "@/lib/bookings";
import { markInquiryHandled } from "@/lib/inquiry";
import type { ActionState } from "./action-state";

// Server Actions are public endpoints: every one re-checks credentials and the payload type.
async function guard(formData: unknown): Promise<FormData> {
  if (!isAdminAuthorization((await headers()).get("authorization"))) throw new Error("Unauthorized");
  if (!(formData instanceof FormData)) throw new Error("Invalid request");
  return formData;
}

const statusSchema = z.object({ bookingId: z.coerce.number().int().positive(), status: z.enum(["confirmed", "cancelled"]) });

export async function updateBookingStatus(formData: FormData) {
  const fd = await guard(formData);
  const { bookingId, status } = statusSchema.parse(Object.fromEntries(fd));
  setBookingStatus(db, bookingId, status);
  refresh();
}

export async function markInquiryHandledAction(formData: FormData) {
  const fd = await guard(formData);
  const { inquiryId } = z.object({ inquiryId: z.coerce.number().int().positive() }).parse(Object.fromEntries(fd));
  markInquiryHandled(db, inquiryId);
  refresh();
}

const idSchema = z.coerce.number().int().positive();
const langSchema = z.string().refine(isLocale);

export async function saveTrip(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fd = await guard(formData);
  const lang = langSchema.parse(fd.get("lang"));
  const rawId = fd.get("id");
  const id = rawId ? idSchema.parse(rawId) : null;

  const parsed = tripInputSchema.safeParse(formDataToTripInput(fd));
  if (!parsed.success) {
    const { code, fields } = tripIssues(parsed.error);
    return { error: code, fields };
  }
  const res = id ? updateTrip(db, id, parsed.data) : createTrip(db, parsed.data);
  if (!res.ok) return { error: res.error };
  if (!id) redirect(`/${lang}/admin/trips/${res.id}`);
  refresh();
  return { ok: true };
}

function departureState(res: DepartureResult): ActionState {
  if (res.ok) {
    refresh();
    return { ok: true };
  }
  return { error: res.error, taken: res.taken };
}

export async function addDepartureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fd = await guard(formData);
  const parsed = z
    .object({ tripId: z.string(), startDate: z.string(), capacity: z.string() })
    .parse(Object.fromEntries(fd));
  // Bad dates / capacities are user input, not tampering: report them instead of throwing.
  try {
    return departureState(addDeparture(db, parsed));
  } catch (e) {
    if (e instanceof z.ZodError) return { error: "invalid", fields: e.issues.map((i) => String(i.path[0])) };
    throw e;
  }
}

export async function setCapacityAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fd = await guard(formData);
  const parsed = z.object({ departureId: z.string(), capacity: z.string() }).parse(Object.fromEntries(fd));
  try {
    return departureState(updateDepartureCapacity(db, parsed));
  } catch (e) {
    if (e instanceof z.ZodError) return { error: "invalid", fields: ["capacity"] };
    throw e;
  }
}

export async function deleteDepartureAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fd = await guard(formData);
  const parsed = z.object({ departureId: z.string() }).parse(Object.fromEntries(fd));
  return departureState(deleteDeparture(db, parsed));
}

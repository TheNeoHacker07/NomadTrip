import { z } from "zod";

/**
 * Allowed option values per field. Display labels live in the `booking` dictionary
 * (`options.<group>.<value>`), so adding a value here means adding a label in every locale.
 */
export const options = {
  messenger: ["whatsapp", "telegram", "email"],
  yurtArrangement: ["shared", "private"],
  fitnessLevel: ["low", "moderate", "high"],
  diet: ["none", "vegetarian", "vegan", "halal", "gluten_free", "other"],
  ridingExperience: ["none", "beginner", "confident"],
  arrivalAirport: ["FRU", "OSS", "other"],
  interests: ["horse_riding", "trekking", "eagle_hunting", "felt_making", "cooking", "photography", "stargazing", "folk_music"],
} as const;

/** Stable validation error codes; translated by the client via `booking.errors[code]`. */
export const errorCodes = [
  "required",
  "full_name_required",
  "invalid_date",
  "dob_in_past",
  "invalid_email",
  "invalid_phone",
  "min_travelers",
  "max_travelers",
  "consent_required",
  "pickup_airport_only",
  "invalid",
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export const MAX_TRAVELERS = 12;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/** Step 1 per-traveler fields: who is coming. */
const travelerWhoShape = {
  fullName: z.string().trim().min(2, { error: "full_name_required" }).max(120),
  dateOfBirth: z.iso.date({ error: "invalid_date" }).refine((d) => d < new Date().toISOString().slice(0, 10), {
    error: "dob_in_past",
  }),
};
/** Step 2 per-traveler fields: experience and needs. */
const travelerExperienceShape = {
  nationality: z.string().trim().min(2, { error: "required" }).max(60),
  diet: z.enum(options.diet),
  allergies: optionalText(500),
  ridingExperience: z.enum(options.ridingExperience),
};
const travelerSchema = z.object({ ...travelerWhoShape, ...travelerExperienceShape });

const travelerList = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .min(1, { error: "min_travelers" })
    .max(MAX_TRAVELERS, { error: "max_travelers" });

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s()-]{7,20}$/, { error: "invalid_phone" });

/** Step 1 — who's coming: lead contact plus each traveler's name and date of birth. */
export const whoStepSchema = z.object({
  contactName: z.string().trim().min(2, { error: "required" }).max(120),
  email: z.email({ error: "invalid_email" }).max(200),
  phone: phoneSchema,
  messenger: z.enum(options.messenger),
  country: z.string().trim().min(2, { error: "required" }).max(60),
  travelers: travelerList(z.object(travelerWhoShape)),
});

/** Step 2 — experience: per-traveler needs plus group preferences. */
export const experienceStepSchema = z.object({
  travelers: travelerList(z.object(travelerExperienceShape)),
  yurtArrangement: z.enum(options.yurtArrangement),
  fitnessLevel: z.enum(options.fitnessLevel),
  interests: z.array(z.enum(options.interests)).max(options.interests.length),
  medicalNotes: optionalText(1000),
  occasion: optionalText(200),
});

const arrivalShape = {
  specialRequests: optionalText(2000),
  referralSource: optionalText(200),
  arrivalAirport: z.enum(options.arrivalAirport),
  needsAirportPickup: z.boolean(),
  arrivalFlight: optionalText(40),
  emergencyName: z.string().trim().min(2, { error: "required" }).max(120),
  emergencyPhone: phoneSchema,
  consent: z.literal(true, { error: "consent_required" }),
};
const pickupRule = {
  check: (b: { needsAirportPickup: boolean; arrivalAirport: string }) => !(b.needsAirportPickup && b.arrivalAirport === "other"),
  params: { path: ["needsAirportPickup"], error: "pickup_airport_only" },
};

/** Step 3 — arrival, safety and consent. */
export const confirmStepSchema = z.object(arrivalShape).refine(pickupRule.check, pickupRule.params);

/** The full schema the server validates; composed from the step schemas, nothing weaker. */
export const bookingInputSchema = z
  .object({
    departureId: z.coerce.number().int().positive(),
    ...whoStepSchema.omit({ travelers: true }).shape,
    ...experienceStepSchema.omit({ travelers: true }).shape,
    travelers: travelerList(travelerSchema),
    ...arrivalShape,
  })
  .refine(pickupRule.check, pickupRule.params);

export type BookingInput = z.infer<typeof bookingInputSchema>;
/** Field path -> error code. */
export type FieldErrors = Record<string, ErrorCode>;

/** Converts flat form fields (`travelers.0.fullName`, repeated `interests`) into the shape the schema validates. */
export function formDataToBookingInput(fd: FormData): unknown {
  const travelers: Record<string, string>[] = [];
  const flat: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    const m = /^travelers\.(\d{1,2})\.(\w+)$/.exec(key);
    if (m) {
      const i = Number(m[1]);
      if (i < MAX_TRAVELERS + 1) (travelers[i] ??= {})[m[2]] = value;
    } else if (key !== "interests") {
      flat[key] = value;
    }
  }
  return {
    ...flat,
    travelers: travelers.filter(Boolean),
    interests: fd.getAll("interests").filter((v) => typeof v === "string"),
    needsAirportPickup: fd.get("needsAirportPickup") === "on",
    consent: fd.get("consent") === "on",
  };
}

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    // Only our own codes pass through; Zod's built-in English messages collapse to "invalid".
    const code = (errorCodes as readonly string[]).includes(issue.message) ? (issue.message as ErrorCode) : "invalid";
    out[issue.path.join(".") || "form"] ??= code;
  }
  return out;
}

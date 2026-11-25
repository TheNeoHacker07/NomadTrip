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

const travelerSchema = z.object({
  fullName: z.string().trim().min(2, { error: "full_name_required" }).max(120),
  dateOfBirth: z.iso.date({ error: "invalid_date" }).refine((d) => d < new Date().toISOString().slice(0, 10), {
    error: "dob_in_past",
  }),
  nationality: z.string().trim().min(2, { error: "required" }).max(60),
  diet: z.enum(options.diet),
  allergies: optionalText(500),
  ridingExperience: z.enum(options.ridingExperience),
});

export const bookingInputSchema = z
  .object({
    departureId: z.coerce.number().int().positive(),
    contactName: z.string().trim().min(2, { error: "required" }).max(120),
    email: z.email({ error: "invalid_email" }).max(200),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s()-]{7,20}$/, { error: "invalid_phone" }),
    messenger: z.enum(options.messenger),
    country: z.string().trim().min(2, { error: "required" }).max(60),
    travelers: z
      .array(travelerSchema)
      .min(1, { error: "min_travelers" })
      .max(MAX_TRAVELERS, { error: "max_travelers" }),
    yurtArrangement: z.enum(options.yurtArrangement),
    fitnessLevel: z.enum(options.fitnessLevel),
    interests: z.array(z.enum(options.interests)).max(options.interests.length),
    medicalNotes: optionalText(1000),
    occasion: optionalText(200),
    specialRequests: optionalText(2000),
    referralSource: optionalText(200),
    arrivalAirport: z.enum(options.arrivalAirport),
    needsAirportPickup: z.boolean(),
    arrivalFlight: optionalText(40),
    emergencyName: z.string().trim().min(2, { error: "required" }).max(120),
    emergencyPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s()-]{7,20}$/, { error: "invalid_phone" }),
    consent: z.literal(true, { error: "consent_required" }),
  })
  .refine((b) => !(b.needsAirportPickup && b.arrivalAirport === "other"), {
    path: ["needsAirportPickup"],
    error: "pickup_airport_only",
  });

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

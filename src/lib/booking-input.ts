import { z } from "zod";

// Option lists are shared by the form (labels) and the validator (allowed values).
export const options = {
  messenger: { whatsapp: "WhatsApp", telegram: "Telegram", email: "Email only" },
  yurtArrangement: {
    shared: "Shared yurt with other travelers",
    private: "Private yurt for our group (supplement)",
  },
  fitnessLevel: {
    low: "Relaxed — short walks only",
    moderate: "Moderate — 3–5 h hikes are fine",
    high: "High — long hikes at altitude",
  },
  diet: {
    none: "No restrictions",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    halal: "Halal",
    gluten_free: "Gluten-free",
    other: "Other (see allergies/notes)",
  },
  ridingExperience: { none: "Never ridden", beginner: "A few times", confident: "Confident rider" },
  arrivalAirport: { FRU: "Bishkek (Manas, FRU)", OSS: "Osh (OSS)", other: "Arriving overland / other" },
  interests: {
    horse_riding: "Horse riding",
    trekking: "Trekking",
    eagle_hunting: "Eagle hunting demonstration",
    felt_making: "Felt-making & crafts",
    cooking: "Nomadic cooking",
    photography: "Photography",
    stargazing: "Stargazing",
    folk_music: "Komuz & folk music",
  },
} as const;

const keysOf = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

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
  fullName: z.string().trim().min(2, { error: "Enter the full name as in passport" }).max(120),
  dateOfBirth: z.iso.date({ error: "Enter a valid date" }).refine((d) => d < new Date().toISOString().slice(0, 10), {
    error: "Date of birth must be in the past",
  }),
  nationality: z.string().trim().min(2, { error: "Required" }).max(60),
  diet: z.enum(keysOf(options.diet)),
  allergies: optionalText(500),
  ridingExperience: z.enum(keysOf(options.ridingExperience)),
});

export const bookingInputSchema = z
  .object({
    departureId: z.coerce.number().int().positive(),
    contactName: z.string().trim().min(2, { error: "Required" }).max(120),
    email: z.email({ error: "Enter a valid email" }).max(200),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s()-]{7,20}$/, { error: "Enter a phone number with country code" }),
    messenger: z.enum(keysOf(options.messenger)),
    country: z.string().trim().min(2, { error: "Required" }).max(60),
    travelers: z
      .array(travelerSchema)
      .min(1, { error: "Add at least one traveler" })
      .max(MAX_TRAVELERS, { error: `Groups larger than ${MAX_TRAVELERS} — please contact us` }),
    yurtArrangement: z.enum(keysOf(options.yurtArrangement)),
    fitnessLevel: z.enum(keysOf(options.fitnessLevel)),
    interests: z.array(z.enum(keysOf(options.interests))).max(Object.keys(options.interests).length),
    medicalNotes: optionalText(1000),
    occasion: optionalText(200),
    specialRequests: optionalText(2000),
    referralSource: optionalText(200),
    arrivalAirport: z.enum(keysOf(options.arrivalAirport)),
    needsAirportPickup: z.boolean(),
    arrivalFlight: optionalText(40),
    emergencyName: z.string().trim().min(2, { error: "Required" }).max(120),
    emergencyPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s()-]{7,20}$/, { error: "Enter a phone number with country code" }),
    consent: z.literal(true, { error: "Please accept so we can process your booking" }),
  })
  .refine((b) => !(b.needsAirportPickup && b.arrivalAirport === "other"), {
    path: ["needsAirportPickup"],
    error: "Pickup is available from FRU or OSS airports only",
  });

export type BookingInput = z.infer<typeof bookingInputSchema>;
export type FieldErrors = Record<string, string>;

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
  for (const issue of error.issues) out[issue.path.join(".") || "form"] ??= issue.message;
  return out;
}

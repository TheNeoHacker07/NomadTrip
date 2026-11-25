import { describe, expect, it } from "vitest";
import {
  bookingInputSchema,
  confirmStepSchema,
  experienceStepSchema,
  formDataToBookingInput,
  toFieldErrors,
  whoStepSchema,
} from "./booking-input";

const who = {
  contactName: "Aida Bekova",
  email: "aida@example.com",
  phone: "+996 555 123 456",
  messenger: "whatsapp",
  country: "Kyrgyzstan",
  travelers: [{ fullName: "Aida Bekova", dateOfBirth: "1990-05-05" }],
};
const experience = {
  travelers: [{ nationality: "Kyrgyz", diet: "none", allergies: "", ridingExperience: "none" }],
  yurtArrangement: "shared",
  fitnessLevel: "moderate",
  interests: ["trekking"],
  medicalNotes: "",
  occasion: "",
};
const confirm = {
  arrivalAirport: "FRU",
  needsAirportPickup: true,
  arrivalFlight: "",
  emergencyName: "Bolot",
  emergencyPhone: "+996 555 000 111",
  specialRequests: "",
  referralSource: "",
  consent: true,
};
const full = {
  departureId: 1,
  ...who,
  ...experience,
  ...confirm,
  travelers: [{ ...who.travelers[0], ...experience.travelers[0] }],
};

describe("step schemas", () => {
  it("accept valid data per step", () => {
    expect(whoStepSchema.safeParse(who).success).toBe(true);
    expect(experienceStepSchema.safeParse(experience).success).toBe(true);
    expect(confirmStepSchema.safeParse(confirm).success).toBe(true);
  });

  it("step 1 reports only its own fields", () => {
    const r = whoStepSchema.safeParse({ ...who, phone: "abc", travelers: [{ fullName: "A", dateOfBirth: "2999-01-01" }] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(toFieldErrors(r.error)).toEqual({
        phone: "invalid_phone",
        "travelers.0.fullName": "full_name_required",
        "travelers.0.dateOfBirth": "dob_in_past",
      });
    }
  });

  it("step 1 ignores step 2/3 fields that are still empty", () => {
    expect(whoStepSchema.safeParse({ ...who, travelers: [{ ...who.travelers[0], nationality: "" }] }).success).toBe(true);
  });

  it("step 2 requires nationality per traveler", () => {
    const r = experienceStepSchema.safeParse({ ...experience, travelers: [{ ...experience.travelers[0], nationality: "" }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error)).toEqual({ "travelers.0.nationality": "required" });
  });

  it("step 3 enforces consent and pickup rule", () => {
    const a = confirmStepSchema.safeParse({ ...confirm, consent: false });
    expect(a.success).toBe(false);
    if (!a.success) expect(toFieldErrors(a.error)).toEqual({ consent: "consent_required" });
    const b = confirmStepSchema.safeParse({ ...confirm, arrivalAirport: "other" });
    expect(b.success).toBe(false);
    if (!b.success) expect(toFieldErrors(b.error)).toEqual({ needsAirportPickup: "pickup_airport_only" });
  });
});

describe("full schema composes the steps", () => {
  it("accepts the combined payload", () => {
    expect(bookingInputSchema.safeParse(full).success).toBe(true);
  });

  it("rejects what any single step rejects", () => {
    expect(bookingInputSchema.safeParse({ ...full, email: "x" }).success).toBe(false);
    expect(bookingInputSchema.safeParse({ ...full, consent: false }).success).toBe(false);
    expect(bookingInputSchema.safeParse({ ...full, travelers: [{ ...full.travelers[0], nationality: "" }] }).success).toBe(false);
    expect(bookingInputSchema.safeParse({ ...full, travelers: [] }).success).toBe(false);
  });

  it("round-trips FormData", () => {
    const fd = new FormData();
    fd.set("departureId", "1");
    for (const k of ["contactName", "email", "phone", "messenger", "country"] as const) fd.set(k, who[k]);
    fd.set("travelers.0.fullName", "Aida Bekova");
    fd.set("travelers.0.dateOfBirth", "1990-05-05");
    fd.set("travelers.0.nationality", "Kyrgyz");
    fd.set("travelers.0.diet", "none");
    fd.set("travelers.0.ridingExperience", "none");
    fd.set("yurtArrangement", "shared");
    fd.set("fitnessLevel", "low");
    fd.append("interests", "trekking");
    fd.set("arrivalAirport", "FRU");
    fd.set("needsAirportPickup", "on");
    fd.set("emergencyName", "Bolot");
    fd.set("emergencyPhone", "+996 555 000 111");
    fd.set("consent", "on");
    fd.set("travelerCount", "1");
    expect(bookingInputSchema.safeParse(formDataToBookingInput(fd)).success).toBe(true);
  });
});

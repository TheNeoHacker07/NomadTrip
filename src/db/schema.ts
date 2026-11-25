import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Localized } from "../i18n/localize";

export type ItineraryDay = { day: number; title: string; description: string; overnight: string };

/** Region keys; display labels live in the `common` dictionary under `regions`. */
export const tripRegions = ["chui", "issyk_kul", "naryn", "talas", "jalal_abad", "osh", "batken", "multi"] as const;
export type TripRegion = (typeof tripRegions)[number];

export const trips = sqliteTable(
  "trips",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    slug: text().notNull().unique(),
    title: text({ mode: "json" }).$type<Localized<string>>().notNull(),
    region: text({ enum: tripRegions }).notNull(),
    summary: text({ mode: "json" }).$type<Localized<string>>().notNull(),
    description: text({ mode: "json" }).$type<Localized<string>>().notNull(),
    durationDays: integer("duration_days").notNull(),
    pricePerPersonUsd: integer("price_per_person_usd").notNull(),
    difficulty: text({ enum: ["easy", "moderate", "challenging"] }).notNull(),
    highlights: text({ mode: "json" }).$type<Localized<string[]>>().notNull(),
    itinerary: text({ mode: "json" }).$type<Localized<ItineraryDay[]>>().notNull(),
  },
  (t) => [
    check("trip_duration_range", sql`${t.durationDays} BETWEEN 2 AND 30`),
    check("trip_price_positive", sql`${t.pricePerPersonUsd} > 0`),
  ],
);

export const departures = sqliteTable(
  "departures",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    tripId: integer("trip_id").notNull().references(() => trips.id),
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    capacity: integer().notNull(),
  },
  (t) => [
    index("departures_trip_idx").on(t.tripId, t.startDate),
    check("departure_capacity_positive", sql`${t.capacity} > 0`),
  ],
);

export const bookingStatuses = ["pending", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    reference: text().notNull().unique(),
    departureId: integer("departure_id").notNull().references(() => departures.id),
    status: text({ enum: bookingStatuses }).notNull().default("pending"),
    travelerCount: integer("traveler_count").notNull(),
    totalPriceUsd: integer("total_price_usd").notNull(),
    // Lead contact
    contactName: text("contact_name").notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    messenger: text({ enum: ["whatsapp", "telegram", "email"] }).notNull(),
    country: text().notNull(),
    // Experience preferences
    yurtArrangement: text("yurt_arrangement", { enum: ["shared", "private"] }).notNull(),
    fitnessLevel: text("fitness_level", { enum: ["low", "moderate", "high"] }).notNull(),
    interests: text({ mode: "json" }).$type<string[]>().notNull(),
    medicalNotes: text("medical_notes"),
    occasion: text(),
    specialRequests: text("special_requests"),
    referralSource: text("referral_source"),
    // Logistics
    arrivalAirport: text("arrival_airport", { enum: ["FRU", "OSS", "other"] }).notNull(),
    needsAirportPickup: integer("needs_airport_pickup", { mode: "boolean" }).notNull(),
    arrivalFlight: text("arrival_flight"),
    emergencyName: text("emergency_name").notNull(),
    emergencyPhone: text("emergency_phone").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [
    index("bookings_departure_idx").on(t.departureId, t.status),
    check("booking_travelers_positive", sql`${t.travelerCount} > 0`),
  ],
);

export const travelers = sqliteTable("travelers", {
  id: integer().primaryKey({ autoIncrement: true }),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(), // YYYY-MM-DD
  nationality: text().notNull(),
  diet: text({ enum: ["none", "vegetarian", "vegan", "halal", "gluten_free", "other"] }).notNull(),
  allergies: text(),
  ridingExperience: text("riding_experience", { enum: ["none", "beginner", "confident"] }).notNull(),
});

export const inquiryStatuses = ["new", "handled"] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];

/** Custom-trip requests from the public inquiry form. No contact detail is ever shown outside /admin. */
export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    lang: text({ enum: ["en", "ru", "ky"] }).notNull(),
    name: text().notNull(),
    email: text().notNull(),
    phone: text(),
    messenger: text({ enum: ["whatsapp", "telegram", "email"] }).notNull(),
    tripId: integer("trip_id").references(() => trips.id),
    preferredStart: text("preferred_start"), // YYYY-MM-DD
    durationDays: integer("duration_days"),
    groupSize: integer("group_size").notNull(),
    message: text().notNull(),
    status: text({ enum: inquiryStatuses }).notNull().default("new"),
  },
  (t) => [
    index("inquiries_status_idx").on(t.status, t.createdAt),
    check("inquiry_duration_range", sql`${t.durationDays} IS NULL OR ${t.durationDays} BETWEEN 2 AND 30`),
    check("inquiry_group_range", sql`${t.groupSize} BETWEEN 1 AND 30`),
  ],
);

export type Trip = typeof trips.$inferSelect;
export type Departure = typeof departures.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Traveler = typeof travelers.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;

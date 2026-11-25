CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`departure_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`traveler_count` integer NOT NULL,
	`total_price_usd` integer NOT NULL,
	`contact_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`messenger` text NOT NULL,
	`country` text NOT NULL,
	`yurt_arrangement` text NOT NULL,
	`fitness_level` text NOT NULL,
	`interests` text NOT NULL,
	`medical_notes` text,
	`occasion` text,
	`special_requests` text,
	`referral_source` text,
	`arrival_airport` text NOT NULL,
	`needs_airport_pickup` integer NOT NULL,
	`arrival_flight` text,
	`emergency_name` text NOT NULL,
	`emergency_phone` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`departure_id`) REFERENCES `departures`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "booking_travelers_positive" CHECK("bookings"."traveler_count" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);--> statement-breakpoint
CREATE INDEX `bookings_departure_idx` ON `bookings` (`departure_id`,`status`);--> statement-breakpoint
CREATE TABLE `departures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trip_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`capacity` integer NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "departure_capacity_positive" CHECK("departures"."capacity" > 0)
);
--> statement-breakpoint
CREATE INDEX `departures_trip_idx` ON `departures` (`trip_id`,`start_date`);--> statement-breakpoint
CREATE TABLE `travelers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`booking_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`nationality` text NOT NULL,
	`diet` text NOT NULL,
	`allergies` text,
	`riding_experience` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`region` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`duration_days` integer NOT NULL,
	`price_per_person_usd` integer NOT NULL,
	`difficulty` text NOT NULL,
	`highlights` text NOT NULL,
	`itinerary` text NOT NULL,
	CONSTRAINT "trip_duration_range" CHECK("trips"."duration_days" BETWEEN 2 AND 30),
	CONSTRAINT "trip_price_positive" CHECK("trips"."price_per_person_usd" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trips_slug_unique` ON `trips` (`slug`);
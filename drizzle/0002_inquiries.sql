CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`lang` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`messenger` text NOT NULL,
	`trip_id` integer,
	`preferred_start` text,
	`duration_days` integer,
	`group_size` integer NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "inquiry_duration_range" CHECK("inquiries"."duration_days" IS NULL OR "inquiries"."duration_days" BETWEEN 2 AND 30),
	CONSTRAINT "inquiry_group_range" CHECK("inquiries"."group_size" BETWEEN 1 AND 30)
);
--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`,`created_at`);
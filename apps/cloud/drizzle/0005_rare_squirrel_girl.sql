CREATE TABLE `connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`schedule` text DEFAULT 'Every 1h' NOT NULL,
	`source_mapping` text DEFAULT '' NOT NULL,
	`secret_ref` text NOT NULL,
	`encrypted_secret` text NOT NULL,
	`last_run_at` text,
	`last_run_status` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);

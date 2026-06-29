CREATE TABLE `team_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_account_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_token_hash_unique` ON `team_invitations` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_team_email_uq` ON `team_invitations` (`team_id`,`email`);
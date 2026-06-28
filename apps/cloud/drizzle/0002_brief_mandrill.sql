CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_email` text,
	`accepted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_team_account_uq` ON `team_members` (`team_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_account_id` text,
	`polar_subscription_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`owner_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `team_id` text REFERENCES teams(id);--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Data backfill (ADR 0011 Phase 2): give every existing account a personal
-- team plus owner membership, and move every existing project onto its
-- creator's personal team. This makes the team-scoped access path universal:
-- a solo user is a one-member team they own, so the team-aware ownership
-- guards treat pre-existing data identically to new data.
--
-- Ids are lower(hex(randomblob(24))) (24 bytes, 48 hex chars, cuid2-like
-- length) — a one-time backfill needs only uniqueness plus a stable shape,
-- not the JS cuid2 algorithm. accounts.id is the join key throughout.
-- Statements are split on the Drizzle break marker so the batch applies in
-- dependency order: teams first, then memberships, then project links.
-- Idempotent guards (WHERE NOT EXISTS) make a re-run a no-op, which is safe
-- under the re-apply the test harness performs.
-- ---------------------------------------------------------------------------

-- 1. One personal team per account (idempotent — skips accounts that already
--    have an owned team, so a re-run never creates a second personal team).
INSERT INTO `teams` (`id`, `name`, `owner_account_id`)
SELECT
	'pt_' || lower(hex(randomblob(24))),
	COALESCE(
		(SELECT `name` FROM `user` WHERE `user`.`id` = `accounts`.`user_id`),
		'Personal'
	) || '''s Workspace',
	`accounts`.`id`
FROM `accounts`
WHERE NOT EXISTS (
	SELECT 1 FROM `teams` AS `t`
	WHERE `t`.`owner_account_id` = `accounts`.`id`
);
--> statement-breakpoint
-- 2. Owner membership for each account on its personal team (idempotent).
INSERT INTO `team_members` (`id`, `team_id`, `account_id`, `role`, `accepted_at`)
SELECT
	'tm_' || lower(hex(randomblob(24))),
	`t`.`id`,
	`accounts`.`id`,
	'owner',
	`accounts`.`created_at`
FROM `accounts`
INNER JOIN `teams` AS `t` ON `t`.`owner_account_id` = `accounts`.`id`
WHERE NOT EXISTS (
	SELECT 1 FROM `team_members` AS `m`
	WHERE `m`.`account_id` = `accounts`.`id` AND `m`.`team_id` = `t`.`id`
);
--> statement-breakpoint
-- 3. Move every existing project onto its creator's personal team (idempotent:
--    only updates rows still missing a team_id).
UPDATE `projects`
SET `team_id` = (
	SELECT `t`.`id` FROM `teams` AS `t`
	WHERE `t`.`owner_account_id` = `projects`.`account_id`
)
WHERE `projects`.`team_id` IS NULL
	AND EXISTS (
		SELECT 1 FROM `teams` AS `t`
		WHERE `t`.`owner_account_id` = `projects`.`account_id`
	);
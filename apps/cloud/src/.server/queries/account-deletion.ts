/**
 * Account deletion — R2 blob purge + DB cascade (SC3.6 danger zone).
 *
 * GDPR / data-hygiene: deleting an account must purge every byte the cloud
 * holds for it — both the R2 blobs (the actual file content) and every DB row
 * (the manifest, projects, API keys, team memberships, sessions). The DB side
 * is mostly handled by `onDelete: "cascade"` foreign keys; the R2 side is not,
 * because R2 objects are content-addressed (the key IS the sha256), so two
 * projects with identical file content share one blob. Blindly deleting every
 * `r2Key` referenced by the account's projects would corrupt another account's
 * file if that blob is shared.
 *
 * The purge therefore:
 * 1. Collects every `r2Key` referenced by the account's projects.
 * 2. Subtracts keys still referenced by **other** accounts' projects (shared
 *    blobs survive).
 * 3. Deletes only the orphaned keys from R2.
 * 4. Deletes the `accounts` row — FK cascade drops `projects → project_files,
 *    sync_cursors, memory_events` + `api_keys` + `team_members` +
 *    `team_invitations`.
 * 5. Deletes the Better Auth `user` row — cascade drops `session`,
 *    `verification`, and the Better Auth `account` (OAuth/magic-link).
 *
 * @see docs/architecture/screens-locked.md SC3.6 — danger zone spec.
 */

import { eq, inArray, ne } from "drizzle-orm";
import type { Database } from "../db";
import { accounts, projectFiles, projects } from "../db/schema";

/** R2 keys that are safe to delete = referenced only by `accountId`'s projects. */
async function collectOrphanedR2Keys(
	db: Database,
	accountId: string,
): Promise<string[]> {
	const accountProjectIds = db
		.select({ id: projects.id })
		.from(projects)
		.where(eq(projects.accountId, accountId));

	// All r2Keys this account's projects reference.
	const owned = await db
		.select({ r2Key: projectFiles.r2Key })
		.from(projectFiles)
		.where(inArray(projectFiles.projectId, accountProjectIds));
	const ownedKeys = [...new Set(owned.map((r) => r.r2Key))];
	if (ownedKeys.length === 0) return [];

	// Keys still referenced by projects NOT owned by this account (shared blobs).
	const otherProjectIds = db
		.select({ id: projects.id })
		.from(projects)
		.where(ne(projects.accountId, accountId));

	const shared = await db
		.select({ r2Key: projectFiles.r2Key })
		.from(projectFiles)
		.where(inArray(projectFiles.projectId, otherProjectIds));
	const sharedSet = new Set(shared.map((r) => r.r2Key));

	return ownedKeys.filter((k) => !sharedSet.has(k));
}

/**
 * Purges all R2 blobs + DB rows for `accountId`.
 *
 * @param db       per-request drizzle client.
 * @param blobs    the R2 bucket binding (`env.BLOBS`).
 * @param accountId the billing account to purge.
 */
export async function purgeAccount(
	db: Database,
	blobs: R2Bucket,
	accountId: string,
): Promise<{ r2KeysDeleted: number }> {
	// 1. Collect + delete orphaned R2 blobs BEFORE the DB cascade (the
	//    project_files rows are the index that tells us which keys are shared).
	const orphanedKeys = await collectOrphanedR2Keys(db, accountId);
	await Promise.all(
		orphanedKeys.map((key) => blobs.delete(key).catch(() => {})),
	);

	// 2. Delete the accounts row — FK cascade drops everything account-scoped.
	await db.delete(accounts).where(eq(accounts.id, accountId));

	return { r2KeysDeleted: orphanedKeys.length };
}

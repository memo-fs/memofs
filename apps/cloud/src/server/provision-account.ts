/**
 * Billing-account provisioning for newly-authenticated users.
 *
 * When a user signs up (magic-link or OAuth), Better Auth inserts a `user` row.
 * The `databaseHooks.user.create.after` hook in `auth.ts` then calls
 * {@link provisionAccount} to create the matching billing identity: an
 * `accounts` row FK-linked to the user (Q decision: separate, FK-linked) PLUS a
 * single default project, so the dashboard lands on a real workspace instead of
 * an empty state.
 *
 * This is the signup analogue of the sync auto-provision path (Q13): the sync
 * path creates a *project* under an *existing* account (key-authenticated);
 * this path creates the *account* for a brand-new *user*. They are deliberately
 * separate because the key-auth and magic-link-auth trust paths are disjoint —
 * but both reuse the `createId`/`projects`/`accounts` tables identically.
 *
 * Idempotent: if an account already exists for `userId` (e.g. a retried hook),
 * it returns the existing one and skips project creation, so a transient retry
 * after a partial failure never produces a second account or default project.
 *
 * @see docs/architecture/decisions.md Q13 — auto-provision (sync path).
 * @see docs/adr/0006-pricing-and-entitlements.md — free-tier default caps.
 */
import { createId } from "@paralleldrive/cuid2";

import type { Database } from "../db/index.server";
import { accounts, type PlanTier, projects } from "../db/schema";
import { getAccountForUser } from "./queries/account";

/**
 * Provisions a billing account + default project for a newly-created user.
 *
 * @param db     per-request drizzle client.
 * @param userId the Better Auth `user.id` just created.
 * @returns the account row (existing or newly inserted).
 */
export async function provisionAccount(
	db: Database,
	userId: string,
): Promise<{ id: string; plan: PlanTier }> {
	// Idempotency guard: a retried hook (or an OAuth-link to an existing user
	// that already provisioned) must not create a second account. Delegates to
	// the SSOT `getAccountForUser` so the `accounts.userId` lookup lives once.
	const existing = await getAccountForUser(db, userId);
	if (existing) return existing;

	const accountId = createId();
	await db.insert(accounts).values({ id: accountId, userId });

	// One default project so the dashboard has a workspace on first visit. The
	// free-tier default name is generic; the user renames it from the dashboard.
	// `isDefault` is true here and only here — every account gets exactly one.
	await db.insert(projects).values({
		id: createId(),
		accountId,
		name: "My Workspace",
		isDefault: true,
	});

	return { id: accountId, plan: "free" };
}

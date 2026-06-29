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
import {
	accounts,
	type PlanTier,
	projects,
	teamMembers,
	teams,
} from "../db/schema";
import { capsForStorage } from "./entitlements";
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

	// Free-tier caps come from the SSOT resolver, NOT the schema default (which
	// is 1 GB and contradicts the catalog's 500 MB). Writing them explicitly at
	// provisioning keeps the denormalised columns honest from row one.
	// `capsForStorage` translates `Infinity` (Teams) to the finite
	// `UNLIMITED_CONNECTORS_SENTINEL` so the integer column never receives
	// `Infinity` (free is finite today, but the write path stays uniform).
	const freeCaps = capsForStorage("free");
	const accountId = createId();
	await db.insert(accounts).values({
		id: accountId,
		userId,
		plan: "free",
		maxHostedStorageBytes: freeCaps.maxHostedStorageBytes,
		maxConnectors: freeCaps.maxConnectors,
	});

	// Every account owns exactly one personal team (ADR 0011 Phase 2): the
	// team-scoped project path is universal, so a solo user is a one-member
	// team they own. The default project is created under this team.
	const teamId = createId();
	await db.insert(teams).values({
		id: teamId,
		name: "My Workspace",
		ownerAccountId: accountId,
	});
	await db.insert(teamMembers).values({
		teamId,
		accountId,
		role: "owner",
		// The owner didn't get an invite — mark accepted at creation.
		acceptedAt: new Date().toISOString(),
	});

	// One default project so the dashboard has a workspace on first visit. It
	// belongs to the personal team (the access boundary); accountId records the
	// creator. `isDefault` is true here and only here.
	await db.insert(projects).values({
		id: createId(),
		accountId,
		teamId,
		name: "My Workspace",
		isDefault: true,
	});

	return { id: accountId, plan: "free" };
}

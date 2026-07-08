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
 * but both reuse the `projects`/`accounts` tables identically.
 *
 * Idempotent: if an account already exists for `userId` (e.g. a retried hook),
 * it returns the existing one and skips project creation, so a transient retry
 * after a partial failure never produces a second account or default project.
 *
 * @see docs/architecture/decisions.md Q13 — auto-provision (sync path).
 * @see docs/adr/0006-pricing-and-entitlements.md — free-tier default caps.
 */
import { capsForStorage } from "../lib/entitlements";
import { getDB } from "./db";
import {
	accounts,
	type PlanTier,
	projects,
	teamMembers,
	teams,
} from "./db/schema";
import { getAccountForUser } from "./queries/account";

/**
 * Provisions a billing account + default project for a newly-created user.
 *
 * @param db     per-request drizzle client.
 * @param userId the Better Auth `user.id` just created.
 * @returns the account row (existing or newly inserted).
 */
export async function provisionAccount(
	userId: string,
): Promise<{ id: string; plan: PlanTier }> {
	const db = getDB();
	// Idempotency guard: a retried hook (or an OAuth-link to an existing user
	// that already provisioned) must not create a second account. Delegates to
	// the SSOT `getAccountForUser` so the `accounts.userId` lookup lives once.
	const existing = await getAccountForUser(userId);
	if (existing) return existing;

	// Free-tier caps come from the SSOT resolver, NOT the schema default (which
	// is 1 GB and contradicts the catalog's 500 MB). Writing them explicitly at
	// provisioning keeps the denormalised columns honest from row one.
	// `capsForStorage` translates `Infinity` (Teams) to the finite
	// `UNLIMITED_CONNECTORS_SENTINEL` so the integer column never receives
	// `Infinity` (free is finite today, but the write path stays uniform).
	const freeCaps = capsForStorage("free");

	// Wrap all inserts in a transaction so a partial failure doesn't leave the
	// DB in an inconsistent state (e.g. account exists but no team/project).
	const result = await db.transaction(async (tx) => {
		const [account] = await tx
			.insert(accounts)
			.values({
				userId,
				plan: "free",
				maxHostedStorageBytes: freeCaps.maxHostedStorageBytes,
				maxConnectors: freeCaps.maxConnectors,
			})
			.returning({ id: accounts.id });
		const accountId = account.id;

		const [team] = await tx
			.insert(teams)
			.values({
				name: "My Workspace",
				ownerAccountId: accountId,
			})
			.returning({ id: teams.id });
		const teamId = team.id;

		await tx.insert(teamMembers).values({
			teamId,
			accountId,
			role: "owner",
			acceptedAt: new Date().toISOString(),
		});

		await tx.insert(projects).values({
			accountId,
			teamId,
			name: "My Workspace",
			isDefault: true,
		});

		return { id: accountId, plan: "free" as const };
	});

	return result;
}

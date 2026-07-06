import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../../../tests/utils/db";
import type { Database } from "../../../db";
import {
	accounts,
	projects,
	teamMembers,
	teams,
	user,
} from "../../../db/schema";
import { PermissionError } from "../../errors";
import type { SyncProject } from "../shared";
import { assertOwns } from "../shared";

/**
 * Team-scoped ownership integration test (ADR 0011 Phase 2).
 *
 * The sync handlers gate every write through `assertOwns`, which delegates to
 * `canWriteProject`: an account may write to a project iff it created the
 * project OR is an accepted member of the project's team. WS4 made that check
 * team-aware; this test exercises it end-to-end through the real `assertOwns`
 * seam (the function the push/pull/complete handlers call), seeding the full
 * `user → accounts → teams → team_members → projects` chain so the join the
 * query layer performs is exercised — not mocked.
 *
 * Covers the three access-control truths the sync path depends on:
 *   - the creator can always write (baseline)
 *   - an accepted team member (not the creator) can write (the collaboration win)
 *   - a non-member (an outsider) is refused with `PermissionError`
 *
 * Plus the pending-invite edge: an invitee who has NOT yet accepted (acceptedAt
 * null) is treated as a non-member — the membership row exists but access is
 * withheld until they join. This is the contract `canWriteProject` encodes and
 * the accept route unlocks.
 */

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
});

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

const CREATOR = "acct_creator";
const TEAMMATE = "acct_teammate";
const OUTSIDER = "acct_outsider";
const PENDING = "acct_pending";
const TEAM = "team_shared";
const PROJECT = "proj_shared";

beforeEach(async () => {
	// Seed the human-identity chain the membership read joins through.
	await seedAccount(db, CREATOR, "creator@x.test");
	await seedAccount(db, TEAMMATE, "teammate@x.test");
	await seedAccount(db, OUTSIDER, "outsider@x.test");
	await seedAccount(db, PENDING, "pending@x.test");

	// A team the creator owns, with an accepted teammate + a pending invitee.
	await db
		.insert(teams)
		.values({ id: TEAM, name: "Shared", ownerAccountId: CREATOR });
	await db.insert(teamMembers).values([
		membership(TEAM, CREATOR, "owner"),
		membership(TEAM, TEAMMATE, "member"),
		// Pending invitee — membership row exists, acceptedAt null.
		{ ...membership(TEAM, PENDING, "member"), acceptedAt: null },
	]);

	// A project on the shared team, created by CREATOR. TEAMMATE didn't make it
	// but is a member → can write. OUTSIDER is on no team → cannot.
	await db.insert(projects).values({
		id: PROJECT,
		accountId: CREATOR,
		teamId: TEAM,
		name: "shared",
	});
});

describe("assertOwns — team-scoped access (ADR 0011 Phase 2)", () => {
	/** The SyncProject shape assertOwns reads, built from the seeded row. */
	const project: SyncProject = {
		id: PROJECT,
		accountId: CREATOR,
		teamId: TEAM,
		totalStorageBytes: 0,
	};

	it("lets the creator write (baseline)", async () => {
		await expect(assertOwns(db, project, CREATOR)).resolves.toBeUndefined();
	});

	it("lets an accepted team member write (collaboration)", async () => {
		// TEAMMATE did not create the project, but is an accepted member of its team.
		await expect(assertOwns(db, project, TEAMMATE)).resolves.toBeUndefined();
	});

	it("refuses an outsider with PermissionError", async () => {
		await expect(assertOwns(db, project, OUTSIDER)).rejects.toBeInstanceOf(
			PermissionError,
		);
	});

	it("refuses a pending (not-yet-accepted) invitee", async () => {
		// PENDING has a membership row but acceptedAt is null — they haven't joined,
		// so access is withheld until the accept route stamps acceptedAt.
		await expect(assertOwns(db, project, PENDING)).rejects.toBeInstanceOf(
			PermissionError,
		);
	});

	it("grants the pending invitee access after they accept", async () => {
		// Simulate the accept: stamp acceptedAt on PENDING's membership.
		await db
			.update(teamMembers)
			.set({ acceptedAt: new Date().toISOString() })
			.where(
				and(eq(teamMembers.teamId, TEAM), eq(teamMembers.accountId, PENDING)),
			);
		await expect(assertOwns(db, project, PENDING)).resolves.toBeUndefined();
	});
});

// --- helpers --------------------------------------------------------------

/** Inserts a `user` + `accounts` row linked by `userId` (the membership read joins these). */
async function seedAccount(
	db: Database,
	accountId: string,
	email: string,
): Promise<void> {
	await db.insert(user).values({
		id: `u_${accountId}`,
		name: email,
		email,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await db.insert(accounts).values({ id: accountId, userId: `u_${accountId}` });
}

/** Builds an accepted membership row with a stable id. */
function membership(
	teamId: string,
	accountId: string,
	role: "owner" | "admin" | "member",
) {
	return {
		id: `${teamId}_${accountId}`,
		teamId,
		accountId,
		role,
		acceptedAt: new Date().toISOString(),
	};
}

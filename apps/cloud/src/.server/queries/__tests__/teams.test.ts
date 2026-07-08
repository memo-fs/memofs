import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../../tests/utils/db";
import type { Database } from "../../db";
import {
	accounts,
	teamInvitations,
	teamMembers,
	teams,
	user,
} from "../../db/schema";
import {
	acceptInvitation,
	accessibleTeamIds,
	assertCanAdmin,
	canWriteProject,
	createInvitation,
	getMembership,
	getPersonalTeam,
	hashToken,
	isAcceptedMember,
	listPendingInvitations,
	listTeamMembers,
	listTeamsForAccount,
	removeTeamMember,
	resolveSeatsUsed,
	revokeInvitation,
	TeamMutationError,
	updateMemberRole,
} from "../teams";

/**
 * Team-membership + collaboration query-layer tests.
 *
 * Two concerns are covered here:
 *   1. The access-control reads (`canWriteProject`, `accessibleTeamIds`,
 *      `isAcceptedMember`) — the existing team-scoped ownership surface that WS4
 *      shipped and the dashboard + sync paths depend on.
 *   2. The collaboration mutations the dashboard `/team` route drives
 *      (invite/accept/revoke/role/remove) — every guard: role authz, the seat
 *      gate, last-owner protection, token single-use + expiry + email-match,
 *      and the upsert idempotency on re-invite / re-accept.
 *
 * The seeding mirrors `provision-account.ts`: a `user` row FK-linked to an
 * `accounts` row, a personal team the account owns, and an owner membership
 * with `acceptedAt` set. `listTeamMembers` joins `team_members → accounts →
 * user`, so all three rows must exist for the read to surface name/email.
 */

const SALT = "test-salt";

// Stable ids so assertions read clearly (explicit ids still win over $defaultFn).
const TEAM_A = "team_a";
const TEAM_B = "team_b";
const ACCT_OWNER = "acct_owner"; // owns TEAM_A
const ACCT_ADMIN = "acct_admin"; // admin on TEAM_A
const ACCT_MEMBER = "acct_member"; // plain member on TEAM_A
const ACCT_OUTSIDER = "acct_outsider"; // not on TEAM_A

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await seedTeam(db, TEAM_A, "Team A", ACCT_OWNER, "owner", "owner@x.test");
	await seedTeam(
		db,
		TEAM_B,
		"Team B",
		ACCT_OUTSIDER,
		"owner",
		"outsider@x.test",
	);
	// An admin + a plain member joined to TEAM_A (accepted).
	await seedAccount(db, ACCT_ADMIN, "admin@x.test");
	await seedAccount(db, ACCT_MEMBER, "member@x.test");
	await db
		.insert(teamMembers)
		.values([
			membership(TEAM_A, ACCT_ADMIN, "admin"),
			membership(TEAM_A, ACCT_MEMBER, "member"),
		]);
});

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

// --- Access-control reads (the WS4 surface, regression-locked here) --------

describe("canWriteProject", () => {
	it("lets the creator write", async () => {
		expect(await canWriteProject(TEAM_A, ACCT_OWNER, ACCT_OWNER)).toBe(true);
	});

	it("lets any accepted team member write (role-agnostic)", async () => {
		expect(await canWriteProject(TEAM_A, ACCT_OWNER, ACCT_ADMIN)).toBe(true);
		expect(await canWriteProject(TEAM_A, ACCT_OWNER, ACCT_MEMBER)).toBe(true);
	});

	it("rejects an outsider", async () => {
		expect(await canWriteProject(TEAM_A, ACCT_OWNER, ACCT_OUTSIDER)).toBe(
			false,
		);
	});

	it("rejects when there is no team (pre-migration row)", async () => {
		expect(await canWriteProject(null, ACCT_OWNER, ACCT_ADMIN)).toBe(false);
	});
});

describe("accessibleTeamIds + isAcceptedMember", () => {
	it("unions the personal team + joined teams", async () => {
		const ids = await accessibleTeamIds(ACCT_ADMIN);
		expect(ids).toContain(TEAM_A); // joined
		expect(ids).not.toContain(TEAM_B); // not a member
	});

	it("isAcceptedMember is true for joined members, false for outsiders", async () => {
		expect(await isAcceptedMember(TEAM_A, ACCT_MEMBER)).toBe(true);
		expect(await isAcceptedMember(TEAM_A, ACCT_OUTSIDER)).toBe(false);
	});
});

describe("getPersonalTeam + getMembership", () => {
	it("resolves the personal team for an owner", async () => {
		const personal = await getPersonalTeam(ACCT_OWNER);
		expect(personal?.id).toBe(TEAM_A);
	});

	it("returns null for an account that owns no team", async () => {
		expect(await getPersonalTeam(ACCT_ADMIN)).toBeNull();
	});

	it("getMembership includes the role + acceptedAt", async () => {
		const m = await getMembership(TEAM_A, ACCT_ADMIN);
		expect(m?.role).toBe("admin");
		expect(m?.acceptedAt).not.toBeNull();
	});
});

// --- Collaboration reads --------------------------------------------------

describe("listTeamsForAccount", () => {
	it("lists teams the account owns or joined, with role + isOwner", async () => {
		const ownerTeams = await listTeamsForAccount(ACCT_OWNER);
		expect(ownerTeams).toEqual([
			expect.objectContaining({ id: TEAM_A, role: "owner", isOwner: true }),
		]);

		const adminTeams = await listTeamsForAccount(ACCT_ADMIN);
		expect(adminTeams).toEqual([
			expect.objectContaining({ id: TEAM_A, role: "admin", isOwner: false }),
		]);
	});
});

describe("listTeamMembers", () => {
	it("returns accepted members with name/email joined, owners first", async () => {
		const members = await listTeamMembers(TEAM_A);
		expect(members.map((m) => m.role)).toEqual(["owner", "admin", "member"]);
		const admin = members.find((m) => m.accountId === ACCT_ADMIN);
		expect(admin?.email).toBe("admin@x.test");
		expect(admin?.name).toBe("admin@x.test");
	});

	it("resolves seats used = accepted member count", async () => {
		expect(await resolveSeatsUsed(TEAM_A)).toBe(3); // owner + admin + member
	});
});

// --- Invitation: create ---------------------------------------------------

describe("createInvitation", () => {
	it("mints an invitation and returns the raw token once", async () => {
		const expiresAt = futureISO(60);
		const { rawToken, invitation } = await createInvitation({
			teamId: TEAM_A,
			email: "new@x.test",
			role: "member",
			actorId: ACCT_OWNER,
			maxSeats: 10,
			rawToken: "tok_abc",
			tokenHash: await hashToken("tok_abc", SALT),
			expiresAt,
		});

		expect(rawToken).toBe("tok_abc");
		expect(invitation.email).toBe("new@x.test");
		expect(invitation.role).toBe("member");
		expect(invitation.expiresAt).toBe(expiresAt);

		// The stored row holds the HASH, never the raw token.
		const stored = await db
			.select({ tokenHash: teamInvitations.tokenHash })
			.from(teamInvitations)
			.where(eq(teamInvitations.email, "new@x.test"))
			.limit(1);
		expect(stored[0].tokenHash).toBe(await hashToken("tok_abc", SALT));
		expect(stored[0].tokenHash).not.toContain(rawToken);
	});

	it("rejects an invite by a plain member (not_authorized)", async () => {
		await expect(
			createInvitation({
				teamId: TEAM_A,
				email: "new@x.test",
				role: "member",
				actorId: ACCT_MEMBER,
				maxSeats: 10,
				rawToken: "tok",
				tokenHash: await hashToken("tok", SALT),
				expiresAt: futureISO(60),
			}),
		).rejects.toMatchObject({ code: "not_authorized" });
	});

	it("rejects an invite by an outsider (not_authorized)", async () => {
		await expect(
			createInvitation({
				teamId: TEAM_A,
				email: "new@x.test",
				role: "member",
				actorId: ACCT_OUTSIDER,
				maxSeats: 10,
				rawToken: "tok",
				tokenHash: await hashToken("tok", SALT),
				expiresAt: futureISO(60),
			}),
		).rejects.toMatchObject({ code: "not_authorized" });
	});

	it("rejects when the email is already an accepted member", async () => {
		await expect(
			createInvitation({
				teamId: TEAM_A,
				email: "admin@x.test", // already a member
				role: "member",
				actorId: ACCT_OWNER,
				maxSeats: 10,
				rawToken: "tok",
				tokenHash: await hashToken("tok", SALT),
				expiresAt: futureISO(60),
			}),
		).rejects.toMatchObject({ code: "already_member" });
	});

	it("rejects when the team is at the seat cap", async () => {
		// TEAM_A has 3 accepted members; set the cap to 3 → seat_limit_reached.
		await expect(
			createInvitation({
				teamId: TEAM_A,
				email: "new@x.test",
				role: "member",
				actorId: ACCT_OWNER,
				maxSeats: 3,
				rawToken: "tok",
				tokenHash: await hashToken("tok", SALT),
				expiresAt: futureISO(60),
			}),
		).rejects.toMatchObject({ code: "seat_limit_reached" });
	});

	it("re-issues (upserts) a pending invite to the same email with a fresh token", async () => {
		await createInvitation({
			teamId: TEAM_A,
			email: "new@x.test",
			role: "member",
			actorId: ACCT_OWNER,
			maxSeats: 10,
			rawToken: "tok_first",
			tokenHash: await hashToken("tok_first", SALT),
			expiresAt: futureISO(60),
		});
		// A second invite to the same email replaces the token, doesn't 500.
		const second = await createInvitation({
			teamId: TEAM_A,
			email: "new@x.test",
			role: "admin",
			actorId: ACCT_OWNER,
			maxSeats: 10,
			rawToken: "tok_second",
			tokenHash: await hashToken("tok_second", SALT),
			expiresAt: futureISO(120),
		});
		expect(second.rawToken).toBe("tok_second");

		const pending = await listPendingInvitations(TEAM_A);
		expect(pending).toHaveLength(1); // upserted, not duplicated
		expect(pending[0].role).toBe("admin"); // refreshed role
	});
});

// --- Invitation: accept ---------------------------------------------------

describe("acceptInvitation", () => {
	it("joins the accepter to the team with the invited role", async () => {
		const { rawToken } = await invite("invitee@x.test", "member");
		// The invitee must be a real user with that email to accept.
		await seedAccount(db, "acct_invitee", "invitee@x.test");

		const result = await acceptInvitation({
			rawToken,
			accepterId: "acct_invitee",
			accepterEmail: "invitee@x.test",
			salt: SALT,
		});
		expect(result).toEqual({ teamId: TEAM_A, role: "member" });

		// The membership exists and is accepted (writable).
		const m = await getMembership(TEAM_A, "acct_invitee");
		expect(m?.role).toBe("member");
		expect(m?.acceptedAt).not.toBeNull();
		expect(await canWriteProject(TEAM_A, ACCT_OWNER, "acct_invitee")).toBe(
			true,
		);
	});

	it("is idempotent on a replay of the same token", async () => {
		const { rawToken } = await invite("invitee@x.test", "admin");
		await seedAccount(db, "acct_invitee", "invitee@x.test");
		await acceptInvitation({
			rawToken,
			accepterId: "acct_invitee",
			accepterEmail: "invitee@x.test",
			salt: SALT,
		});
		// A second accept of the now-accepted token doesn't throw or duplicate.
		const again = await acceptInvitation({
			rawToken,
			accepterId: "acct_invitee",
			accepterEmail: "invitee@x.test",
			salt: SALT,
		});
		expect(again.role).toBe("admin");
		expect(await resolveSeatsUsed(TEAM_A)).toBe(4); // not double-counted
	});

	it("rejects an unknown token (not_found)", async () => {
		await seedAccount(db, "acct_invitee", "invitee@x.test");
		await expect(
			acceptInvitation({
				rawToken: "nonexistent",
				accepterId: "acct_invitee",
				accepterEmail: "invitee@x.test",
				salt: SALT,
			}),
		).rejects.toMatchObject({ code: "not_found" });
	});

	it("rejects an expired invite (expired)", async () => {
		const { rawToken } = await invite("invitee@x.test", "member", -1); // past
		await seedAccount(db, "acct_invitee", "invitee@x.test");
		await expect(
			acceptInvitation({
				rawToken,
				accepterId: "acct_invitee",
				accepterEmail: "invitee@x.test",
				salt: SALT,
			}),
		).rejects.toMatchObject({ code: "expired" });
	});

	it("rejects when the accepter's email differs from the invite (anti-hijack)", async () => {
		const { rawToken } = await invite("invitee@x.test", "member");
		// A different, already-existing user gets hold of the token.
		await expect(
			acceptInvitation({
				rawToken,
				accepterId: ACCT_OUTSIDER, // outsider@x.test, not invitee@x.test
				accepterEmail: "outsider@x.test",
				salt: SALT,
			}),
		).rejects.toMatchObject({ code: "email_mismatch" });

		// The outsider was NOT joined.
		expect(
			await getMembership(TEAM_A, ACCT_OUTSIDER)?.then((m) => m?.role),
		).toBe(undefined);
	});
});

// --- Invitation: revoke + read --------------------------------------------

describe("revokeInvitation + listPendingInvitations", () => {
	it("deletes a pending invite (owner)", async () => {
		const { invitation } = await invite("new@x.test", "member");
		await revokeInvitation(TEAM_A, invitation.id, ACCT_OWNER);
		expect(await listPendingInvitations(TEAM_A)).toHaveLength(0);
	});

	it("rejects a revoke by a plain member", async () => {
		const { invitation } = await invite("new@x.test", "member");
		await expect(
			revokeInvitation(TEAM_A, invitation.id, ACCT_MEMBER),
		).rejects.toMatchObject({ code: "not_authorized" });
		// Still pending.
		expect(await listPendingInvitations(TEAM_A)).toHaveLength(1);
	});

	it("is idempotent — revoking a nonexistent invite is a no-op", async () => {
		await expect(
			revokeInvitation(TEAM_A, "ghost", ACCT_OWNER),
		).resolves.toBeUndefined();
	});
});

// --- Role change + remove -------------------------------------------------

describe("updateMemberRole", () => {
	it("changes a member's role (owner action)", async () => {
		await updateMemberRole(TEAM_A, ACCT_MEMBER, "admin", ACCT_OWNER);
		expect((await getMembership(TEAM_A, ACCT_MEMBER))?.role).toBe("admin");
	});

	it("rejects a role change by a plain member", async () => {
		await expect(
			updateMemberRole(TEAM_A, ACCT_ADMIN, "member", ACCT_MEMBER),
		).rejects.toMatchObject({ code: "not_authorized" });
	});

	it("refuses to demote the only owner (last_owner)", async () => {
		// ACCT_OWNER is the sole owner; demoting is refused.
		await expect(
			updateMemberRole(TEAM_A, ACCT_OWNER, "member", ACCT_OWNER),
		).rejects.toMatchObject({ code: "last_owner" });
	});
});

describe("removeTeamMember", () => {
	it("removes a member (owner action)", async () => {
		await removeTeamMember(TEAM_A, ACCT_MEMBER, ACCT_OWNER);
		expect(await getMembership(TEAM_A, ACCT_MEMBER)).toBeNull();
	});

	it("allows a member to leave (self-remove)", async () => {
		await removeTeamMember(TEAM_A, ACCT_MEMBER, ACCT_MEMBER);
		expect(await getMembership(TEAM_A, ACCT_MEMBER)).toBeNull();
	});

	it("rejects removal of another by a plain member", async () => {
		await expect(
			removeTeamMember(TEAM_A, ACCT_ADMIN, ACCT_MEMBER),
		).rejects.toMatchObject({ code: "not_authorized" });
	});

	it("refuses to remove the only owner (last_owner)", async () => {
		await expect(
			removeTeamMember(TEAM_A, ACCT_OWNER, ACCT_OWNER),
		).rejects.toMatchObject({ code: "last_owner" });
	});

	it("allows removing the owner once a second owner exists", async () => {
		// Promote the admin to owner, then the original owner can leave.
		await db
			.update(teamMembers)
			.set({ role: "owner" })
			.where(eq(teamMembers.id, `${TEAM_A}_${ACCT_ADMIN}`));
		await removeTeamMember(TEAM_A, ACCT_OWNER, ACCT_OWNER);
		expect(await getMembership(TEAM_A, ACCT_OWNER)).toBeNull();
	});
});

describe("assertCanAdmin", () => {
	it("passes for owner + admin, throws for member + outsider", async () => {
		await expect(assertCanAdmin(TEAM_A, ACCT_OWNER)).resolves.toBeUndefined();
		await expect(assertCanAdmin(TEAM_A, ACCT_ADMIN)).resolves.toBeUndefined();
		await expect(assertCanAdmin(TEAM_A, ACCT_MEMBER)).rejects.toMatchObject({
			code: "not_authorized",
		});
		await expect(assertCanAdmin(TEAM_A, ACCT_OUTSIDER)).rejects.toMatchObject({
			code: "not_authorized",
		});
	});
});

describe("TeamMutationError", () => {
	it("carries the stable code on the instance", () => {
		const err = new TeamMutationError("seat_limit_reached");
		expect(err.code).toBe("seat_limit_reached");
		expect(err).toBeInstanceOf(TeamMutationError);
		expect(err).toBeInstanceOf(Error);
	});
});

// --- Test helpers ---------------------------------------------------------

/** Inserts a `user` + `accounts` row linked by `userId` (the FK `listTeamMembers` joins). */
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

/**
 * Seeds a team owned by `ownerId` with the owner as an accepted member, plus the
 * owner's user/account rows. Mirrors the provisioning shape so every membership
 * row has a joinable user identity.
 */
async function seedTeam(
	db: Database,
	teamId: string,
	name: string,
	ownerId: string,
	role: "owner" | "admin" | "member",
	email: string,
): Promise<void> {
	await seedAccount(db, ownerId, email);
	await db.insert(teams).values({ id: teamId, name, ownerAccountId: ownerId });
	await db.insert(teamMembers).values(membership(teamId, ownerId, role));
}

/** Builds an accepted membership row with a stable id (for cleanup lookups). */
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

/** ISO timestamp `minutesFromNow` minutes in the future (negative = past). */
function futureISO(minutesFromNow: number): string {
	return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

/**
 * Creates a default invitation (member role, +60min) and returns the raw token +
 * invitation view. Actor is the team owner with a generous seat cap.
 */
async function invite(
	email: string,
	role: "admin" | "member",
	expiresInMinutes = 60,
) {
	return createInvitation({
		teamId: TEAM_A,
		email,
		role,
		actorId: ACCT_OWNER,
		maxSeats: 10,
		rawToken: `tok_${email}`,
		tokenHash: await hashToken(`tok_${email}`, SALT),
		expiresAt: futureISO(expiresInMinutes),
	});
}

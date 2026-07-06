/**
 * Team-membership queries — the access-control SSOT for team-scoped projects.
 *
 * A project belongs to a team (`projects.team_id`); an account accesses it iff
 * it is the creator (`projects.account_id`) OR a member of that team. The
 * membership row carries the role (Owner/Admin/Member), which gates dashboard
 * admin actions — but the **sync write path** allows any member, because the
 * concurrency layer (ADR 0010) serializes concurrent writes safely (ADR 0011
 * Phase 2: the roles gate collaboration-admin, not the write itself).
 *
 * This module is also the SSOT for the team-collaboration mutations the dashboard
 * `/team` route drives: invite (email → single-use token), accept (token →
 * membership), revoke invite, change role, remove member. Every mutation is
 * role-gated (owner/admin) + seat-gated (`maxSeats` from the entitlement SSOT),
 * with last-owner protection so a team can never be left ownerless.
 *
 * Pure `(db, …)` helpers, no Hono/Worker coupling — unit-tested with the
 * in-memory `createTestDb()` harness like every query module. The mailer +
 * token-mint live in the route layer (`routes/dashboard/team.tsx`), which calls
 * `createInvitation` with a pre-hashed token; this module never touches the raw
 * token, only its hash.
 *
 * @see docs/adr/0011-managed-runtime-sequencing.md — Phase 2 ownership model.
 */

import { createId } from "@paralleldrive/cuid2";
import { and, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import type { Database } from "../db";
import {
	accounts,
	type InvitationRole,
	type TeamRole,
	teamInvitations,
	teamMembers,
	teams,
	user,
} from "../db/schema";
import { sha256Hex } from "../utils";

/** A membership row, narrowed to the fields callers read. */
export interface TeamMembership {
	teamId: string;
	accountId: string;
	role: TeamRole;
	/** Null while an invite is pending; set when the invitee accepts. */
	acceptedAt: string | null;
}

/**
 * A team member as the dashboard table renders it — the membership joined to
 * the human identity. `email`/`name` come from the Better Auth `user` via the
 * billing `accounts.userId` link. `acceptedAt` is always set for a member row
 * (pending invitees live in `PendingInvitationView`).
 */
export interface TeamMemberView {
	accountId: string;
	role: TeamRole;
	name: string;
	email: string;
	/** ISO timestamp of when the membership was created (join time). */
	createdAt: string;
}

/**
 * A pending invitation as the dashboard renders it. `email` is the invitee
 * (they may not be a user yet); the raw accept token is NOT here — only the
 * inviter's identity for the row. `expiresAt` drives the "expires in" label and
 * the accept-route validity check.
 */
export interface PendingInvitationView {
	id: string;
	email: string;
	role: InvitationRole;
	/** ISO timestamp of when the accept link stops being valid. */
	expiresAt: string;
	/** ISO timestamp the invite was issued. */
	createdAt: string;
}

/**
 * A team the account may select in the dashboard team switcher — owned or
 * joined. `role` is the account's role on the team (drives which admin actions
 * render); `isOwner` is a convenience flag. The personal team is the one the
 * account owns that seeded at provisioning.
 */
export interface TeamSummary {
	id: string;
	name: string;
	/** The account's role on this team (owner/admin/member). */
	role: TeamRole;
	/** True when the account owns this team (created it). */
	isOwner: boolean;
}

/** The result of {@link createInvitation}: the raw token (for the email link). */
export interface CreatedInvitation {
	/** The raw accept token — emitted once, only to mint the email link. */
	rawToken: string;
	/** The persisted invitation view (sans token hash). */
	invitation: PendingInvitationView;
}

/** Why a mutation was rejected — surfaced to the UI as a user-facing message. */
export type TeamMutationErrorCode =
	| "not_authorized"
	| "seat_limit_reached"
	| "last_owner"
	| "not_found"
	| "already_invited"
	| "already_member"
	| "expired"
	| "email_mismatch";

/** A thrown, typed team-mutation error carrying a stable code for the UI. */
export class TeamMutationError extends Error {
	constructor(
		public readonly code: TeamMutationErrorCode,
		message?: string,
	) {
		super(message ?? code);
		this.name = "TeamMutationError";
	}
}

/**
 * Look up an account's membership on a team, or null if it is not a member.
 *
 * Includes pending (not-yet-accepted) invites — callers that need only accepted
 * members should check `acceptedAt` on the result. The sync write path treats
 * pending members as NOT able to write (they haven't joined).
 */
export async function getMembership(
	db: Database,
	teamId: string,
	accountId: string,
): Promise<TeamMembership | null> {
	const rows = await db
		.select({
			teamId: teamMembers.teamId,
			accountId: teamMembers.accountId,
			role: teamMembers.role,
			acceptedAt: teamMembers.acceptedAt,
		})
		.from(teamMembers)
		.where(
			and(eq(teamMembers.teamId, teamId), eq(teamMembers.accountId, accountId)),
		)
		.limit(1);
	return rows[0] ?? null;
}

/**
 * The personal team for an account (the one-member team every account owns),
 * or null if none exists. The personal team is auto-created at provisioning; a
 * null here means the account predates the Phase 2 migration and wasn't
 * backfilled (the `0002_*` migration covers the deploy case).
 */
export async function getPersonalTeam(
	db: Database,
	accountId: string,
): Promise<{ id: string; name: string } | null> {
	const rows = await db
		.select({ id: teams.id, name: teams.name })
		.from(teams)
		.where(eq(teams.ownerAccountId, accountId))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Resolve the account id that owns a given Polar customer id. Used by the
 * webhook to find the account behind a subscription when the checkout did not
 * stamp `memofs_account_id` in metadata.
 */
export async function getAccountIdByPolarCustomerId(
	db: Database,
	polarCustomerId: string,
): Promise<string | null> {
	const rows = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.polarCustomerId, polarCustomerId))
		.limit(1);
	return rows[0]?.id ?? null;
}

/**
 * Whether `accountId` may sync-write to a project. True if the account created
 * the project OR is an accepted member of the project's team. Pending invitees
 * (acceptedAt null) and non-members are rejected; a project with no team is
 * only writable by its creator (a pre-migration row not yet backfilled).
 *
 * The membership check ignores role — every accepted role writes; the
 * concurrency layer serializes concurrent writes safely (ADR 0011 Phase 2).
 *
 * @param teamId      the project's team (null = pre-migration / personal pre-team).
 * @param creatorId   the account that first created the project.
 * @param accountId   the account requesting access.
 */
export async function canWriteProject(
	db: Database,
	teamId: string | null,
	creatorId: string,
	accountId: string,
): Promise<boolean> {
	// The creator always has access — they made the project.
	if (creatorId === accountId) return true;
	// No team means no shared path: only the creator may write. This covers
	// pre-migration rows pending the `0002_*` backfill (teamId null).
	if (!teamId) return false;
	const membership = await getMembership(db, teamId, accountId);
	// A pending invite (acceptedAt null) has not joined yet — no write access.
	return membership !== null && membership.acceptedAt !== null;
}

/**
 * Whether `accountId` is an accepted member of `teamId` (any role). The
 * dashboard uses this for read access to team projects (listing, viewing) —
 * lighter than {@link canWriteProject} since it doesn't take a creator.
 */
export async function isAcceptedMember(
	db: Database,
	teamId: string,
	accountId: string,
): Promise<boolean> {
	const membership = await getMembership(db, teamId, accountId);
	return membership !== null && membership.acceptedAt !== null;
}

/**
 * The team ids an account can access (personal team + every team it has joined).
 * Used by the dashboard project list to union personal + shared projects.
 */
export async function accessibleTeamIds(
	db: Database,
	accountId: string,
): Promise<string[]> {
	// Accepted memberships (joined teams — acceptedAt set).
	const joined = await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(
			and(
				eq(teamMembers.accountId, accountId),
				isNotNull(teamMembers.acceptedAt),
			),
		);
	// The personal team (owned).
	const personal = await getPersonalTeam(db, accountId);
	const ids = new Set<string>(joined.map((r) => r.teamId));
	if (personal) ids.add(personal.id);
	return [...ids];
}

// ---------------------------------------------------------------------------
// Team-collaboration reads + mutations (the dashboard `/team` surface).
//
// Conventions enforced everywhere below:
//   - Admin actions (invite / revoke / change-role / remove) require the actor
//     to be an owner OR admin of the team; a plain member is refused with a
//     `not_authorized` {@link TeamMutationError}. `assertCanAdmin` is the guard.
//   - Seat gate: inviting refuses when accepted seats are already at the plan's
//     `maxSeats` (resolved by the caller from the entitlement SSOT and passed
//     in, keeping this module env-free). `resolveSeatsUsed` is the count.
//   - Last-owner protection: a team can never be left without an owner, so
//     removing or demoting the final owner is refused.
// ---------------------------------------------------------------------------

/**
 * The teams an account may manage in the dashboard switcher: those it owns plus
 * those it has joined. The personal team is included via the ownership path
 * (every account owns exactly one). `role` is the account's role on each team.
 */
export async function listTeamsForAccount(
	db: Database,
	accountId: string,
): Promise<TeamSummary[]> {
	const rows = await db
		.select({
			id: teams.id,
			name: teams.name,
			role: teamMembers.role,
			isOwner: isNotNull(teams.ownerAccountId),
		})
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.where(
			and(
				eq(teamMembers.accountId, accountId),
				isNotNull(teamMembers.acceptedAt),
			),
		)
		.orderBy(desc(teams.createdAt));
	// `isOwner` is true when this account owns the team (ownerAccountId matches).
	const owned = await db
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.ownerAccountId, accountId));
	const ownedSet = new Set(owned.map((t) => t.id));
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		role: r.role,
		isOwner: ownedSet.has(r.id),
	}));
}

/**
 * The accepted members of a team, joined to the human identity for the dashboard
 * table. `email`/`name` come from the Better Auth `user` via `accounts.userId`.
 * Ordered owners-first, then by join time. A team with no members is impossible
 * in practice (the owner row is created with the team), so an empty result means
 * the caller's account can't reach the team — callers should resolve access
 * before calling.
 */
export async function listTeamMembers(
	db: Database,
	teamId: string,
): Promise<TeamMemberView[]> {
	const rows = await db
		.select({
			accountId: teamMembers.accountId,
			role: teamMembers.role,
			name: user.name,
			email: user.email,
			createdAt: teamMembers.createdAt,
			// Role hierarchy rank so owners sort before admins before members,
			// regardless of the alphabetical role string (owner/admin/member).
			rank: sql`case ${teamMembers.role}
				when 'owner' then 0
				when 'admin' then 1
				else 2 end`.as("rank"),
		})
		.from(teamMembers)
		.innerJoin(accounts, eq(accounts.id, teamMembers.accountId))
		.innerJoin(user, eq(user.id, accounts.userId))
		.where(
			and(eq(teamMembers.teamId, teamId), isNotNull(teamMembers.acceptedAt)),
		)
		.orderBy(sql`rank`, teamMembers.createdAt);
	return rows.map((r) => ({
		accountId: r.accountId,
		role: r.role,
		name: r.name,
		email: r.email,
		createdAt: r.createdAt,
	}));
}

/**
 * The pending (not-yet-accepted, not-expired) invitations for a team, newest
 * first. The dashboard renders these in a separate "Pending invites" section so
 * owners/admins can revoke. Expired-but-unaccepted invites are filtered out
 * here (they're dead); accept-route lookups still reject them explicitly.
 */
export async function listPendingInvitations(
	db: Database,
	teamId: string,
): Promise<PendingInvitationView[]> {
	const rows = await db
		.select({
			id: teamInvitations.id,
			email: teamInvitations.email,
			role: teamInvitations.role,
			expiresAt: teamInvitations.expiresAt,
			createdAt: teamInvitations.createdAt,
		})
		.from(teamInvitations)
		.where(
			and(
				eq(teamInvitations.teamId, teamId),
				isNull(teamInvitations.acceptedAt),
			),
		)
		.orderBy(desc(teamInvitations.createdAt));
	return rows.map((r) => ({
		id: r.id,
		email: r.email,
		role: r.role,
		expiresAt: r.expiresAt,
		createdAt: r.createdAt,
	}));
}

/**
 * The number of accepted members on a team — the seat count the entitlement
 * gate compares against `maxSeats`. Pending invitees do NOT count (they haven't
 * joined and may never), so the gate is honest: it blocks only when the team is
 * actually full of joined members.
 */
export async function resolveSeatsUsed(
	db: Database,
	teamId: string,
): Promise<number> {
	const rows = await db
		.select({ n: count() })
		.from(teamMembers)
		.where(
			and(eq(teamMembers.teamId, teamId), isNotNull(teamMembers.acceptedAt)),
		);
	return rows[0]?.n ?? 0;
}

/**
 * Loads a pending invitation by its raw token (hashed here, never stored raw),
 * or null if the token matches no pending invite. Expiry + accepted checks are
 * the caller's (the accept route) responsibility — this just resolves the row so
 * the route can decide on a clear status (expired / already-accepted / valid).
 *
 * Accepting uses {@link hashToken} (salted sha256 via `server/sha256.ts`), the
 * same discipline as API keys: the raw token appears only in the email link.
 *
 * @param db         per-request drizzle client.
 * @param rawToken   the raw token from the accept link.
 * @param salt       `MEMOFS_API_KEY_SALT` (injected, not read from env).
 */
export async function getInvitationByToken(
	db: Database,
	rawToken: string,
	salt: string,
): Promise<{
	id: string;
	teamId: string;
	email: string;
	role: InvitationRole;
	expiresAt: string;
	acceptedAt: string | null;
} | null> {
	const tokenHash = await hashToken(rawToken, salt);
	const rows = await db
		.select({
			id: teamInvitations.id,
			teamId: teamInvitations.teamId,
			email: teamInvitations.email,
			role: teamInvitations.role,
			expiresAt: teamInvitations.expiresAt,
			acceptedAt: teamInvitations.acceptedAt,
		})
		.from(teamInvitations)
		.where(eq(teamInvitations.tokenHash, tokenHash))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Salted sha256 of an accept token — mirrors the API-key discipline
 * (`sha256(salt + ":" + token)`). The raw token appears only in the email link;
 * the hash is the only thing persisted. Re-uses the same `MEMOFS_API_KEY_SALT`
 * binding, so there is one salt to rotate.
 *
 * @param salt  `MEMOFS_API_KEY_SALT` (injected, not read from env).
 */
export async function hashToken(
	rawToken: string,
	salt: string,
): Promise<string> {
	return sha256Hex(`${salt}:${rawToken}`);
}

/**
 * Throws `not_authorized` unless `actorId` is an owner or admin of `teamId`.
 * The single guard every admin mutation shares. A plain member (or a non-member)
 * is refused identically, so the error doesn't leak role membership.
 */
export async function assertCanAdmin(
	db: Database,
	teamId: string,
	actorId: string,
): Promise<void> {
	const membership = await getMembership(db, teamId, actorId);
	if (!membership || membership.acceptedAt === null) {
		throw new TeamMutationError("not_authorized");
	}
	if (membership.role !== "owner" && membership.role !== "admin") {
		throw new TeamMutationError("not_authorized");
	}
}

/**
 * Creates (or re-issues) a pending invitation. The raw token is generated,
 * hashed, and persisted; the caller receives it ONCE to mint the email link.
 *
 * Guards:
 *   - Actor must be owner/admin of the team (`assertCanAdmin`).
 *   - The email must not already be an accepted member (`already_member`).
 *   - Seats must be below `maxSeats` (`seat_limit_reached`).
 *   - `(teamId, email)` is unique: a re-invite to an already-pending email
 *     replaces the existing row (new token, new expiry, fresh link) so the
 *     unique index never blocks a legitimate re-invite. This is an upsert.
 *
 * The route mints the raw token, computes `tokenHash` via {@link hashToken}, and
 * passes BOTH in — this module never touches crypto. The raw token is returned
 * exactly once (in {@link CreatedInvitation.rawToken}) so the route can mint the
 * email link; it is stored nowhere.
 *
 * @param db            per-request drizzle client.
 * @param teamId        the team to invite into.
 * @param email         the invitee email (lower-cased, trimmed by the route).
 * @param role          the role the invitee gets on accept (admin/member).
 * @param actorId       the inviting account (must be owner/admin).
 * @param maxSeats      the plan seat cap (from the entitlement SSOT).
 * @param rawToken      the freshly minted raw token (returned once for the link).
 * @param tokenHash     sha256 of the raw token (persisted, never the raw token).
 * @param expiresAt     ISO timestamp the link stops being valid.
 */
export async function createInvitation(
	db: Database,
	{
		teamId,
		email,
		role,
		actorId,
		maxSeats,
		rawToken,
		tokenHash,
		expiresAt,
	}: {
		teamId: string;
		email: string;
		role: InvitationRole;
		actorId: string;
		maxSeats: number;
		rawToken: string;
		tokenHash: string;
		expiresAt: string;
	},
): Promise<CreatedInvitation> {
	await assertCanAdmin(db, teamId, actorId);

	// An accepted member can't be re-invited — they're already in.
	const existingMember = await db
		.select({ id: teamMembers.id })
		.from(teamMembers)
		.innerJoin(accounts, eq(accounts.id, teamMembers.accountId))
		.innerJoin(user, eq(user.id, accounts.userId))
		.where(
			and(
				eq(teamMembers.teamId, teamId),
				eq(user.email, email),
				isNotNull(teamMembers.acceptedAt),
			),
		)
		.limit(1);
	if (existingMember.length > 0) {
		throw new TeamMutationError("already_member");
	}

	// Seat gate: count accepted members; pending invitees don't count (they may
	// never accept), so the gate only fires when the team is genuinely full.
	const seatsUsed = await resolveSeatsUsed(db, teamId);
	if (seatsUsed >= maxSeats) {
		throw new TeamMutationError("seat_limit_reached");
	}

	const id = createId();
	const createdAt = new Date().toISOString();

	// Upsert on (teamId, email): a re-invite replaces a pending invite (new token
	// + expiry). `onConflictDoUpdate` targets the unique index so the second
	// invite to the same email doesn't 500 — it refreshes the link.
	await db
		.insert(teamInvitations)
		.values({
			id,
			teamId,
			email,
			role,
			invitedByAccountId: actorId,
			tokenHash,
			expiresAt,
			acceptedAt: null,
		})
		.onConflictDoUpdate({
			target: [teamInvitations.teamId, teamInvitations.email],
			set: {
				role,
				invitedByAccountId: actorId,
				tokenHash,
				expiresAt,
				acceptedAt: null,
			},
		});

	return {
		rawToken,
		invitation: {
			id,
			email,
			role,
			expiresAt,
			createdAt,
		},
	};
}

/**
 * Accepts a pending invitation by its raw token, joining the accepter to the
 * team. Idempotent on re-delivery: a second accept of the same token finds
 * `acceptedAt` set and returns the existing membership without re-inserting.
 *
 * Guards:
 *   - The token must resolve to a pending invite (`not_found`).
 *   - `expiresAt` must be in the future (`expired`).
 *   - The accepter's email must match the invite email (`email_mismatch`) — this
 *     is the anti-hijack check: a token leaked/forwarded to another account can
 *     never join that other account to the team.
 *
 * On success: stamps `acceptedAt`, resolves/creates the `team_members` row (also
 * idempotent via the unique (team, account) index), and returns the membership.
 *
 * @param db          per-request drizzle client.
 * @param rawToken    the token from the accept link.
 * @param accepterId  the accepting account (already auth-resolved by the route).
 * @param accepterEmail  the accepter's `user.email`, checked against the invite.
 * @param salt        `MEMOFS_API_KEY_SALT`.
 */
export async function acceptInvitation(
	db: Database,
	{
		rawToken,
		accepterId,
		accepterEmail,
		salt,
	}: {
		rawToken: string;
		accepterId: string;
		accepterEmail: string;
		salt: string;
	},
): Promise<{ teamId: string; role: InvitationRole }> {
	const invitation = await getInvitationByToken(db, rawToken, salt);
	if (!invitation) throw new TeamMutationError("not_found");
	if (invitation.acceptedAt !== null) {
		// Already accepted — idempotent: return the conferred team/role without
		// re-inserting the membership. A replay of the link just re-confirms.
		return { teamId: invitation.teamId, role: invitation.role };
	}
	if (new Date(invitation.expiresAt).getTime() < Date.now()) {
		throw new TeamMutationError("expired");
	}
	if (invitation.email !== accepterEmail) {
		throw new TeamMutationError("email_mismatch");
	}

	const now = new Date().toISOString();
	// Stamp the invite accepted (single-use; a replay is idempotent above).
	await db
		.update(teamInvitations)
		.set({ acceptedAt: now })
		.where(eq(teamInvitations.id, invitation.id));

	// Upsert the membership: a re-accept after a partial state races to the
	// unique (team, account) index, which refreshes the role. `acceptedAt` is
	// set so the member is immediately writable (ADR 0011 Phase 2).
	await db
		.insert(teamMembers)
		.values({
			id: createId(),
			teamId: invitation.teamId,
			accountId: accepterId,
			role: invitation.role,
			acceptedAt: now,
		})
		.onConflictDoUpdate({
			target: [teamMembers.teamId, teamMembers.accountId],
			set: { role: invitation.role, acceptedAt: now },
		});

	return { teamId: invitation.teamId, role: invitation.role };
}

/**
 * Revokes (deletes) a pending invitation. Owner/admin only. Idempotent: revoking
 * an already-accepted or nonexistent invite is a no-op. The token is invalidated
 * by row deletion, so any cached/pasted link stops resolving.
 */
export async function revokeInvitation(
	db: Database,
	teamId: string,
	invitationId: string,
	actorId: string,
): Promise<void> {
	await assertCanAdmin(db, teamId, actorId);
	await db
		.delete(teamInvitations)
		.where(
			and(
				eq(teamInvitations.id, invitationId),
				eq(teamInvitations.teamId, teamId),
			),
		);
}

/**
 * Changes a member's role. Owner/admin only. The owner role cannot be granted
 * via this surface (ownership transfer is a deferred Phase 3 admin action), so
 * `newRole` is admin/member. Last-owner protection: demoting the only owner is
 * refused — but since this method can't make owners, the guard protects the
 * inverse path (a future transfer surface will re-check). Implemented here as:
 * refuse to act on the only owner regardless of direction.
 */
export async function updateMemberRole(
	db: Database,
	teamId: string,
	memberAccountId: string,
	newRole: "admin" | "member",
	actorId: string,
): Promise<void> {
	await assertCanAdmin(db, teamId, actorId);

	// Refuse if the target is the only owner (can't strip the last owner).
	const owners = await db
		.select({ id: teamMembers.accountId })
		.from(teamMembers)
		.where(
			and(
				eq(teamMembers.teamId, teamId),
				eq(teamMembers.role, "owner"),
				isNotNull(teamMembers.acceptedAt),
			),
		);
	if (owners.length === 1 && owners[0].id === memberAccountId) {
		throw new TeamMutationError("last_owner");
	}

	await db
		.update(teamMembers)
		.set({ role: newRole, updatedAt: new Date().toISOString() })
		.where(
			and(
				eq(teamMembers.teamId, teamId),
				eq(teamMembers.accountId, memberAccountId),
			),
		);
}

/**
 * Removes a member from a team (or lets a member leave). Owner/admin only —
 * EXCEPT an account may always remove itself (leave). Last-owner protection:
 * removing the only owner is refused (the team must never be ownerless; the
 * owner transfers ownership or deletes the team first).
 *
 * @param actorId  the account performing the removal (owner/admin, or self-leave).
 */
export async function removeTeamMember(
	db: Database,
	teamId: string,
	memberAccountId: string,
	actorId: string,
): Promise<void> {
	// Self-leave is always allowed; removing another requires owner/admin.
	if (actorId !== memberAccountId) {
		await assertCanAdmin(db, teamId, actorId);
	}

	// Last-owner protection: removing the only owner is refused.
	const owners = await db
		.select({ id: teamMembers.accountId })
		.from(teamMembers)
		.where(
			and(
				eq(teamMembers.teamId, teamId),
				eq(teamMembers.role, "owner"),
				isNotNull(teamMembers.acceptedAt),
			),
		);
	if (owners.length === 1 && owners[0].id === memberAccountId) {
		throw new TeamMutationError("last_owner");
	}

	await db
		.delete(teamMembers)
		.where(
			and(
				eq(teamMembers.teamId, teamId),
				eq(teamMembers.accountId, memberAccountId),
			),
		);
}

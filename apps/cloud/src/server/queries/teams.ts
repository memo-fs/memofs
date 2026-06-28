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
 * Pure `(db, …)` helpers, no Hono/Worker coupling — unit-tested with the
 * in-memory `createTestDb()` harness like every query module.
 *
 * @see docs/adr/0011-managed-runtime-sequencing.md — Phase 2 ownership model.
 */

import { and, eq, isNotNull } from "drizzle-orm";

import type { Database } from "../../db/index.server";
import { accounts, type TeamRole, teamMembers, teams } from "../../db/schema";

/** A membership row, narrowed to the fields callers read. */
export interface TeamMembership {
	teamId: string;
	accountId: string;
	role: TeamRole;
	/** Null while an invite is pending; set when the invitee accepts. */
	acceptedAt: string | null;
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
 * stamp `tekmemo_account_id` in metadata.
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

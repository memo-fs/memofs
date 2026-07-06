import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { accounts } from "./control-plane";
import { idColumn } from "./helpers";

// Teams (collaboration): teams + team_members
//
// A team is the unit of shared memory: projects belong to a team, and accounts
// access them via `team_members` (Owner / Admin / Member). Every account gets a
// personal team at signup (so the team path is universal — solo users are just a
// one-member team they own), and may create or join additional teams. Shared-
// project WRITE access is the concurrency-gated surface (ADR 0011 Phase 1); the
// roles here gate dashboard/admin actions, not the sync write path (any member
// writes — the concurrency layer serializes them safely).

/**
 * A team — the unit of shared memory (ADR 0006 Teams tier).
 *
 * Every account owns exactly one **personal team** (created at provisioning) so
 * the team-scoped project path is universal: a solo user is a one-member team
 * they own. Additional teams are real collaborative workspaces. `ownerAccountId`
 * is the initial owner; ownership is transferable (nullable + `set null` so the
 * team survives an owner leaving before a transfer — the membership rows remain
 * the source of who can act).
 *
 * `polarSubscriptionId` links a Teams-plan team to its Polar seat-pool
 * subscription; null for personal/free teams.
 */
export const teams = sqliteTable("teams", {
	id: idColumn(),
	/** Human name. Personal teams are seeded as "{Name}'s Workspace". */
	name: text("name").notNull(),
	/**
	 * The account that created the team / its current owner. Nullable: an owner
	 * leaving before transferring ownership orphans the team (members still act
	 * via `team_members`); onDelete set null avoids cascading a team away when a
	 * single member account is deleted.
	 */
	ownerAccountId: text("owner_account_id").references(() => accounts.id, {
		onDelete: "set null",
	}),
	/**
	 * Polar subscription id for the seat pool (Teams tier). Null for personal
	 * teams and any team not billed per-seat.
	 */
	polarSubscriptionId: text("polar_subscription_id"),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

/**
 * Membership row: an account's role on a team. `(teamId, accountId)` is unique.
 *
 * `role` is `owner|admin|member`. All roles can sync-write to the team's
 * projects (the concurrency layer serializes them); the role gates invite /
 * remove / role-change / billing admin actions in the dashboard.
 *
 * `acceptedAt` is null until an invitee accepts — null members are pending
 * invites (counted for seat entitlement but cannot auth until they accept).
 */
export const teamMembers = sqliteTable(
	"team_members",
	{
		id: idColumn(),
		teamId: text("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		accountId: text("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["owner", "admin", "member"] }).notNull(),
		/** Email the invite was sent to (null for the auto-created owner row). */
		invitedByEmail: text("invited_by_email"),
		/** Null until the invitee accepts; null = pending invite. */
		acceptedAt: text("accepted_at"),
		createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
		updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
	},
	(table) => [
		// One membership per (team, account).
		uniqueIndex("team_members_team_account_uq").on(
			table.teamId,
			table.accountId,
		),
	],
);

/**
 * A pending team invitation — a single-use, expiring email-token join offer.
 *
 * The membership table's invariants are deliberately kept strict
 * (`team_members.account_id` is NOT NULL + unique per team): an invitee who has
 * not yet joined cannot occupy a membership row. Instead the invitation lives
 * here, carrying the **invitee email** (not an account — the person may not have
 * signed up yet) plus a **hashed** single-use token, the role they'll get on
 * accept, and the inviter. On accept (in `routes/team/accept.tsx`) the row is
 * resolved into a `team_members` row and `accepted_at` is stamped.
 *
 * This mirrors Better Auth's own `verification` table (token-based, single-use,
 * expiring) — the established token-join pattern in this codebase. The raw token
 * is stored NOWHERE: only `token_hash` (sha256, via `server/sha256.ts`, the same
 * discipline as API keys). The raw token appears only in the emailed accept link
 * and is looked up by hashing it on accept.
 *
 * `(teamId, email)` is unique so there is at most one pending invite per email
 * per team; re-inviting a pending email replaces the token (see `createInvitation`
 * in `queries/teams.ts`). `expiresAt` governs the link lifetime; `acceptedAt`
 * null = pending, set once on the single accepted transition.
 */
export const teamInvitations = sqliteTable(
	"team_invitations",
	{
		id: idColumn(),
		/** The team this invite opens membership on. */
		teamId: text("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		/** The invitee's email — matched against the accepter's `user.email`. */
		email: text("email").notNull(),
		/** sha256 of the raw accept token (salted like API keys); never the raw token. */
		tokenHash: text("token_hash").notNull().unique(),
		/** The role the invitee receives on accept (owner is never offered here). */
		role: text("role", { enum: ["admin", "member"] }).notNull(),
		/** The account that issued the invite (for attribution + revocation UI). */
		invitedByAccountId: text("invited_by_account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		/** When the accept link stops being valid. */
		expiresAt: text("expires_at").notNull(),
		/** Null until the invitee accepts; null = pending, set once on accept. */
		acceptedAt: text("accepted_at"),
		createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	},
	(table) => [
		// One pending invite per email per team.
		uniqueIndex("team_invitations_team_email_uq").on(table.teamId, table.email),
	],
);

// Inferred Types & Helper Types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;

/** The role an account holds on a team — gates dashboard/admin actions. */
export type TeamRole = (typeof teamMembers.role.enumValues)[number];

/** The role an invitation confers on accept (owner can't be offered via invite). */
export type InvitationRole = (typeof teamInvitations.role.enumValues)[number];

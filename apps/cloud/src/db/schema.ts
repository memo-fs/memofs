/**
 * Drizzle ORM schema for the cloud metadata store (Turso/libSQL).
 *
 * The cloud stores METADATA ONLY — no memory content (ADR 0005 §12.2, D1).
 * File bytes live in R2 under `tekmemo/blobs/{sha256}`; this schema holds the
 * index that maps canonical `.tekmemo/` paths to those blobs, plus the
 * auth/entitlement spine and the sync cursors that order push/pull.
 *
 * Table map (locked by cloud-sync-and-refactor.md §4 + ADR 0006):
 *
 *   Auth (Better Auth core tables — SC4.1 passwordless):
 *     user           — the authenticated human. Login identity (email).
 *     session        — a Better Auth session (cookie token → user).
 *     account        — an OAuth credential link (GitHub/Google). Distinct from
 *                      the billing `accounts` table.
 *     verification   — single-use magic-link tokens.
 *
 *   Spine (entitlement):
 *     accounts       — one per BILLING identity (Polar customer). Owns projects.
 *                      FK-linked to Better Auth `user` via `user_id` (separate
 *                      tables, per the Q user/account decision). NOT the same as
 *                      Better Auth's `account` (OAuth credential).
 *     api_keys       — hashed bearer credentials; authenticates sync requests.
 *                      The cloud NEVER stores raw keys — only a salted sha256
 *                      lookup hash (ADR 0006 §entitlement model).
 *
 *   Sync core (the cloud manifest, relationalised per §4.3):
 *     projects       — one per synced `.tekmemo/` workspace. Belongs to an
 *                      account. Carries the entitlement snapshot at write time.
 *     project_files  — one row per canonical file the cloud currently holds.
 *                      This IS the cloud manifest: { path → { sha256, r2Key,
 *                      sizeBytes, updatedAt } } (§4.3), relationalised so we
 *                      can diff by path/sha256 without loading the whole map.
 *     sync_cursors   — monotonic, per-project ordering token for push/pull.
 *                      Each committed push bumps the cursor; clients echo it
 *                      back as `baseCursor`/`since` for incremental sync.
 *
 * @see docs/architecture/cloud-sync-and-refactor.md §4 — file-based manifest
 *      replication (path → sha256), the sync unit + identity primitive.
 * @see docs/adr/0005-cloud-tech-stack.md — Turso/Drizzle + R2 (metadata/blobs).
 * @see docs/adr/0006-pricing-and-entitlements.md — entitlement caps, hashed keys.
 *
 * ## Naming convention (Q12, locked 2026-06-21)
 * - **DB identifiers** (table names, column names, index names) = `snake_case`.
 *   SQLite/libSQL, like Postgres, folds unquoted identifiers and has no native
 *   camelCase; `snake_case` is the ecosystem norm and reads cleanly in raw SQL.
 * - **Drizzle table consts** (the JS variable holding the table) = `camelCase`.
 * - **Inferred types** (when added) = `PascalCase`.
 * - Drizzle decouples the two: the 1st arg to `sqliteTable()` is the DB string;
 *   the variable name is TS-only. So `apiKeys` the const maps to `api_keys` the
 *   table — idiomatic JS `account.apiKey` with a `snake_case` column.
 */
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Auto-generates a row id at insert time when the caller omits it.
 *
 * Our id columns are `text("id").primaryKey()` (cuid2, not a SQLite autoincrement).
 * Without a default, every insert site had to call `createId()` manually — noise
 * this helper removes. `.$defaultFn` runs in JS at insert time (no DDL, no
 * migration): an explicit id still wins, an omitted one is filled. Applied to the
 * tables we own + insert into; NOT to Better Auth's four tables (it always
 * supplies its own ids).
 */
const idColumn = () => text("id").primaryKey().$defaultFn(createId);

// ---------------------------------------------------------------------------
// Better Auth core tables: user, session, account, verification
//
// These match the field set Better Auth's drizzleAdapter expects (core schema
// in @better-auth/core/db/schema/*). The Drizzle const names MUST be singular
// (`user`, `session`, `account`, `verification`) to match Better Auth's model
// names — the adapter looks them up as `schema[model]`.
//
// Dates use `integer({ mode: "timestamp" })`: Better Auth's drizzle adapter
// sets supportsDates implicitly true and wraps reads in `new Date()`; booleans
// use `integer({ mode: "boolean" })` (supportsBooleans default true).
//
// NOTE: Better Auth's `account` (OAuth credential) is DISTINCT from our billing
// `accounts` table below. Naming is unfortunate but both are the ecosystem
// default — see `accounts` doc for the distinction.
// ---------------------------------------------------------------------------

/**
 * The authenticated human. Owned by Better Auth (core `user` model). The
 * billing `accounts` row (below) is FK-linked to this via `accounts.userId`.
 *
 * `email` is unique (login identity) and lower-cased by Better Auth before
 * storage. `emailVerified` flips true when the magic link is consumed.
 */
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	/** Display name; seeded from the email local-part at signup. */
	name: text("name").notNull(),
	/** Login identity, unique, lower-cased by Better Auth. */
	email: text("email").notNull().unique(),
	/** True once the user has clicked a magic link (or OAuth completed). */
	emailVerified: integer("email_verified", { mode: "boolean" })
		.notNull()
		.default(false),
	/** Avatar URL (OAuth providers supply this; null for magic-link users). */
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * A Better Auth session (core `session` model). The `token` is the cookie
 * value; `expiresAt` governs validity. We read this to resolve the dashboard
 * loader's current user.
 */
export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	/** Same value carried in the `better-auth.session_token` cookie. */
	token: text("token").notNull().unique(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	/** Best-effort IP of the session-creating request. */
	ipAddress: text("ip_address"),
	/** User-Agent of the session-creating request. */
	userAgent: text("user_agent"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * An OAuth credential link (core `account` model). `providerId` is "github" /
 * "google"; `accountId` is the provider's user id. Magic-link users have NO
 * row here — magic-link verification uses the `verification` table instead.
 * Fields like `accessToken` are nullable because they may not apply to every
 * provider/flow.
 *
 * DO NOT confuse with the billing `accounts` table.
 */
export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	/** The owning authenticated user. */
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	/** OAuth provider id ("github", "google", …). */
	providerId: text("provider_id").notNull(),
	/** The provider's id for this user. */
	accountId: text("account_id").notNull(),
	/** OAuth access token (nullable — not all flows issue one we keep). */
	accessToken: text("access_token"),
	/** OAuth refresh token. */
	refreshToken: text("refresh_token"),
	/** OIDC id token, when the provider returns one. */
	idToken: text("id_token"),
	/** When the access token expires. */
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	/** When the refresh token expires. */
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	/** OAuth scopes granted, space-delimited. */
	scope: text("scope"),
	/** Password hash — unused under SC4.1 (passwordless) but kept for parity. */
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/**
 * A single-use verification token (core `verification` model). Magic-link
 * flows write a row here; consuming it (one-shot) marks the user verified and
 * creates the session. `expiresAt` governs the link lifetime.
 */
export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	/** The opaque token embedded in the magic link. */
	value: text("value").notNull(),
	/** What this verification is for (typically the user's email). */
	identifier: text("identifier").notNull(),
	/** When the token stops being valid. */
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ---------------------------------------------------------------------------
// Spine: accounts (billing) + api_keys
// ---------------------------------------------------------------------------

/**
 * A billing identity. One account owns many projects; entitlements are
 * resolved at request time from the account's Polar subscription (ADR 0006).
 *
 * `polarCustomerId` is nullable because the local-first model lets an account
 * exist before billing is ever attached (e.g. CLI-created, pre-Polar).
 *
 * `userId` FK-links this billing identity to the Better Auth `user` that owns
 * it (Q decision: separate tables, FK-linked). Nullable for pre-auth rows
 * created via the sync auto-provision path (Q13); new signups always set it
 * via the `user.create.after` hook. onDelete: set null so deleting the user
 * retains the (now orphaned) billing record for reconciliation.
 */
export const accounts = sqliteTable("accounts", {
	id: idColumn(),
	/** The authenticated user who owns this billing identity. Nullable for
	 * CLI/sync-auto-provisioned rows that predate signup. */
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	/** Polar customer ID once billing is wired; null for pre-billing accounts. */
	polarCustomerId: text("polar_customer_id"),
	/** Entitlement snapshot for this account (see ADR 0006 §entitlement model). */
	plan: text("plan", { enum: ["free", "pro", "teams"] })
		.notNull()
		.default("free"),
	/** Storage cap in bytes the account is entitled to (numeric, not plan-name). */
	maxHostedStorageBytes: real("max_hosted_storage_bytes")
		.notNull()
		.default(1e9),
	/** Connector cap (ADR 0006 §maxConnectors). */
	maxConnectors: integer("max_connectors").notNull().default(1),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

/**
 * The entitlement plan tier — the single source of truth for the plan union.
 * Derived from the `accounts.plan` column enum so the schema is the only place
 * the values are listed; every consumer imports this type instead of repeating
 * `"free" | "pro" | "teams"`. Named `PlanTier` to avoid collision with the
 * pricing-catalog `Plan` type in `routes/_home/+utils/plans.ts` (a distinct
 * marketing concept). Nullable variants (`PlanTier | null`) are derived at the
 * call site (e.g. a session user whose account is not yet provisioned).
 */
export type PlanTier = (typeof accounts.plan.enumValues)[number];

/**
 * A hashed API key. The cloud authenticates sync requests by Bearer token;
 * the raw key is shown ONCE at provisioning and never persisted. We store a
 * salted sha256 of the raw key for lookup (ADR 0006 §entitlement model).
 *
 * The salt comes from the `TEKMEMO_API_KEY_SALT` Worker binding; `keyHash`
 * here is `sha256(salt + ":" + rawKey)`.
 */
export const apiKeys = sqliteTable("api_keys", {
	id: idColumn(),
	/** Owning account — the key authenticates AS this account. */
	accountId: text("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	/** Salted sha256 lookup hash; never the raw key. */
	keyHash: text("key_hash").notNull().unique(),
	/** Human label for the dashboard ("laptop", "ci", …). */
	label: text("label"),
	/** sha256 of the raw key, shown to the user to recognise a key without it. */
	lastFour: text("last_four"),
	/** Soft-delete / revocation. Null = active. */
	revokedAt: text("revoked_at"),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Teams (collaboration): teams + team_members — ADR 0006 Teams tier / ADR 0011 Phase 2.
//
// A team is the unit of shared memory: projects belong to a team, and accounts
// access them via `team_members` (Owner / Admin / Member). Every account gets a
// personal team at signup (so the team path is universal — solo users are just a
// one-member team they own), and may create or join additional teams. Shared-
// project WRITE access is the concurrency-gated surface (ADR 0011 Phase 1); the
// roles here gate dashboard/admin actions, not the sync write path (any member
// writes — the concurrency layer serializes them safely).
// ---------------------------------------------------------------------------

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

/** The role an account holds on a team — gates dashboard/admin actions. */
export type TeamRole = (typeof teamMembers.role.enumValues)[number];

// ---------------------------------------------------------------------------
// Sync core: projects + project_files + sync_cursors
// ---------------------------------------------------------------------------

/**
 * One synced `.tekmemo/` workspace. The `id` is the `:projectId` in
 * `/v1/projects/:projectId/sync/*`.
 *
 * Ownership is team-scoped (ADR 0011 Phase 2): a project belongs to a **team**
 * (`teamId`), and any member of that team can sync-write to it (serialized by
 * the concurrency layer). `accountId` records the **creator** (the account that
 * first pushed this id) for attribution + the auto-provision path; it is NOT the
 * access-control boundary anymore — `teamId` membership is.
 *
 * `teamId` is nullable only for the migration window; the `0002_*` migration
 * backfills every existing project onto its creator's personal team, after which
 * it is effectively non-null.
 *
 * The account-scoped entitlement snapshot is denormalised here so a sync
 * request can run a 402 entitlement check (ADR 0006) against the project's
 * owning account without an extra join in the hot path.
 */
export const projects = sqliteTable("projects", {
	id: idColumn(),
	/** The account that first created/pushed this project (attribution). */
	accountId: text("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	/**
	 * The team this project belongs to — the access-control boundary. Nullable
	 * only during the migration window (backfilled to the creator's personal
	 * team). A null here after migration is treated as inaccessible.
	 */
	teamId: text("team_id").references(() => teams.id, { onDelete: "cascade" }),
	/** Human name shown in the dashboard. */
	name: text("name").notNull(),
	/** Default project for this account (one per account). */
	isDefault: integer("is_default", { mode: "boolean" })
		.notNull()
		.default(false),
	/** Running total of bytes stored across `project_files`. Entitlement gate. */
	totalStorageBytes: real("total_storage_bytes").notNull().default(0),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

/**
 * One row per canonical file the cloud currently holds FOR a project.
 *
 * This table IS the cloud manifest (cloud-sync-and-refactor.md §4.3): a map of
 * `{ canonicalPath → { sha256, r2Key, sizeBytes, updatedAt } }`, relationalised
 * so the push/pull handlers diff by `(projectId, path)` without loading the
 * whole manifest. `(projectId, path)` is unique — one live version per path.
 *
 * The R2 object key is the sha256 (content-addressed), so identical file
 * content across projects shares one blob in R2; this row just records that a
 * given project's path currently points at it.
 */
export const projectFiles = sqliteTable(
	"project_files",
	{
		id: idColumn(),
		projectId: text("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		/** Canonical `.tekmemo/` path, e.g. `.tekmemo/memory/core.md`. */
		path: text("path").notNull(),
		/** sha256 hex digest of the file content. Identity/version primitive. */
		sha256: text("sha256").notNull(),
		/** R2 object key the bytes live under (content-addressed = the sha256). */
		r2Key: text("r2_key").notNull(),
		/** Content size in bytes. */
		sizeBytes: integer("size_bytes").notNull(),
		/** Server wall-clock timestamp of the last commit to this path. */
		updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
	},
	(table) => [
		// One live version per canonical path per project.
		uniqueIndex("project_files_project_path_uq").on(
			table.projectId,
			table.path,
		),
	],
);

/**
 * Monotonic per-project ordering token for push/pull. Each committed push
 * inserts a row; clients echo back the latest cursor they've seen as
 * `baseCursor` (push) or `since` (pull) for incremental sync.
 *
 * `seq` is the numeric cursor value returned to clients (lexicographically
 * sortable as a string); `id` is the row identity. We keep a full history row
 * per commit rather than bumping a counter so pull-since can be answered by a
 * filtered scan of `project_files.updatedAt`, and the cursor remains stable
 * across replays.
 */
export const syncCursors = sqliteTable("sync_cursors", {
	id: idColumn(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	/** Monotonic sequence number — this is the cursor value clients hold. */
	seq: integer("seq").notNull(),
	/** What kind of commit produced this cursor. */
	kind: text("kind", { enum: ["push", "pull", "init"] }).notNull(),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

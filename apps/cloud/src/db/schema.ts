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
 *   Spine (auth + entitlement):
 *     accounts     — one per billing identity (Polar customer). Owns projects.
 *     api_keys     — hashed bearer credentials; authenticates sync requests.
 *                    The cloud NEVER stores raw keys — only a salted sha256
 *                    lookup hash (ADR 0006 §entitlement model).
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
import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Spine: accounts + api_keys
// ---------------------------------------------------------------------------

/**
 * A billing identity. One account owns many projects; entitlements are
 * resolved at request time from the account's Polar subscription (ADR 0006).
 *
 * `polarCustomerId` is nullable because the local-first model lets an account
 * exist before billing is ever attached (e.g. CLI-created, pre-Polar).
 */
export const accounts = sqliteTable("accounts", {
	id: text("id").primaryKey(),
	/** Polar customer ID once billing is wired; null for pre-billing accounts. */
	polarCustomerId: text("polar_customer_id"),
	/** Entitlement snapshot for this account (see ADR 0006 §entitlement model). */
	plan: text("plan", { enum: ["free", "pro", "teams"] })
		.notNull()
		.default("free"),
	/** Storage cap in bytes the account is entitled to (numeric, not plan-name). */
	maxHostedStorageBytes: real("max_hosted_storage_bytes").notNull().default(1e9),
	/** Connector cap (ADR 0006 §maxConnectors). */
	maxConnectors: integer("max_connectors").notNull().default(1),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(current_timestamp)`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(current_timestamp)`),
});

/**
 * A hashed API key. The cloud authenticates sync requests by Bearer token;
 * the raw key is shown ONCE at provisioning and never persisted. We store a
 * salted sha256 of the raw key for lookup (ADR 0006 §entitlement model).
 *
 * The salt comes from the `TEKMEMO_API_KEY_SALT` Worker binding; `keyHash`
 * here is `sha256(salt + ":" + rawKey)`.
 */
export const apiKeys = sqliteTable("api_keys", {
	id: text("id").primaryKey(),
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
	createdAt: text("created_at")
		.notNull()
		.default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Sync core: projects + project_files + sync_cursors
// ---------------------------------------------------------------------------

/**
 * One synced `.tekmemo/` workspace. Belongs to an account. The `id` is the
 * `:projectId` in `/v1/projects/:projectId/sync/*`.
 *
 * The account-scoped entitlement snapshot is denormalised here so a sync
 * request can run a 402 entitlement check (ADR 0006) against the project's
 * owning account without an extra join in the hot path.
 */
export const projects = sqliteTable("projects", {
	id: text("id").primaryKey(),
	accountId: text("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	/** Human name shown in the dashboard. */
	name: text("name").notNull(),
	/** Default project for this account (one per account). */
	isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
	/** Running total of bytes stored across `project_files`. Entitlement gate. */
	totalStorageBytes: real("total_storage_bytes").notNull().default(0),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(current_timestamp)`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(current_timestamp)`),
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
		id: text("id").primaryKey(),
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
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`(current_timestamp)`),
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
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	/** Monotonic sequence number — this is the cursor value clients hold. */
	seq: integer("seq").notNull(),
	/** What kind of commit produced this cursor. */
	kind: text("kind", { enum: ["push", "pull", "init"] }).notNull(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(current_timestamp)`),
});

import { sql } from "drizzle-orm";
import {
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { idColumn } from "./helpers";
import { teams } from "./team";

// Spine: accounts (billing) + api_keys

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
	/**
	 * Connector cap (ADR 0006 §maxConnectors). The "unlimited" sentinel (Teams
	 * tier) is stored as a large finite integer (`UNLIMITED_CONNECTORS`) because
	 * `integer` can't hold `Infinity` and SQLite column-nullability changes are
	 * expensive table rebuilds. The read model (`entitlements.ts` `normalizeCaps`)
	 * rehydrates the sentinel back to `Infinity` for the
	 * `connectorsUsed < maxConnectors` check, so consumers never see the sentinel.
	 */
	maxConnectors: integer("max_connectors").notNull().default(1),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

/**
 * A hashed API key. The cloud authenticates sync requests by Bearer token;
 * the raw key is shown ONCE at provisioning and never persisted. We store a
 * salted sha256 of the raw key for lookup (ADR 0006 §entitlement model).
 *
 * The salt comes from the `MEMOFS_API_KEY_SALT` Worker binding; `keyHash`
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
// Sync core: projects + project_files + sync_cursors
// ---------------------------------------------------------------------------

/**
 * One synced `.memofs/` workspace. The `id` is the `:projectId` in
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
 * content across projects shares one its blob in R2; this row just records that a
 * given project's path currently points at it.
 */
export const projectFiles = sqliteTable(
	"project_files",
	{
		id: idColumn(),
		projectId: text("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		/** Canonical `.memofs/` path, e.g. `.memofs/memory/core.md`. */
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

/**
 * Hosted-runtime audit trail — one row per runtime event on a project (SC10).
 *
 * The cloud's hosted-memory tier (v1.1) runs the `MemoFS` engine over a
 * project's R2-resident `.memofs/` files. That engine mutates memory
 * (consolidation retires graph nodes, agents write facts, core memory is
 * updated), and every mutation is a moment the user may want to audit. This
 * table is that audit trail — distinct from `sync_cursors` (which records file
 * replica commits) and `project_files` (the manifest): it records the
 * *semantic* events the runtime produces, not the byte-level sync events.
 *
 * Used by the Recent-activity feed (`/dashboard/recent-activity`) alongside the
 * sync feed, so a user sees both "your files synced" and "consolidation retired
 * 3 duplicate nodes" in one place. Cheap to write (one row per event) and
 * append-only (never updated) — the audit trail is immutable.
 *
 * @see docs/architecture/screens-locked.md SC10 — project-scoped activity feed.
 */
export const memoryEvents = sqliteTable("memory_events", {
	id: idColumn(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	/**
	 * The kind of runtime event. `consolidation` = a consolidation run (retired
	 * nodes / merged duplicates); `write` = an agent/hosted write mutated a
	 * memory document; `core_update` = core memory was rewritten.
	 */
	kind: text("kind", {
		enum: ["consolidation", "write", "core_update", "pre_warm"],
	}).notNull(),
	/** Human-readable summary of the event (e.g. "Retired 3 duplicate nodes"). */
	summary: text("summary").notNull(),
	/** The actor that triggered it: an api-key id, "hosted", or "system". */
	actor: text("actor").notNull(),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Connectors control-plane (SC3.3 / ADR 0002).
//
// Connectors run locally (the cloud never ingests — Q29), but their config +
// secrets are managed from the dashboard (control plane). This table is the
// server-side state: the connector config + the encrypted token (never synced
// to R2 — only the opaque `secretRef` rides in `.memofs/connectors.json`).
// The local runtime fetches the token at run time via an authenticated API call.
// ---------------------------------------------------------------------------

/**
 * A configured connector for a project (SC3.3).
 *
 * The token is stored encrypted (AES-GCM via the Worker secret) — it is never
 * synced to R2 and never displayed in the dashboard. `secretRef` is the opaque
 * reference that rides in `connectors.json`; the local runtime uses it to
 * fetch the live token over an authenticated call at run time (ADR 0002).
 */
export const connectors = sqliteTable("connectors", {
	id: idColumn(),
	/** The project this connector belongs to (`connectors.json` is per-project). */
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id, { onDelete: "cascade" }),
	/** Connector type: `github` | `notion` (Linear is queued, Q10). */
	type: text("type", { enum: ["github", "notion"] }).notNull(),
	/** Human label shown in the dashboard ("My GitHub repos", …). */
	name: text("name").notNull(),
	/** Enabled flag — the local runtime skips disabled connectors. */
	enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
	/** Schedule string (e.g. "Every 1h", "Manual") — interpreted by the local runtime. */
	schedule: text("schedule").notNull().default("Every 1h"),
	/** Source mapping (e.g. `repos: org/*`, `notion: workspace/db`). */
	sourceMapping: text("source_mapping").notNull().default(""),
	/** Opaque reference for the local runtime to fetch the live token. */
	secretRef: text("secret_ref").notNull(),
	/** The encrypted token (AES-GCM, base64). Never synced, never displayed. */
	encryptedSecret: text("encrypted_secret").notNull(),
	/** Last run timestamp (null = never run). Set by the local runtime. */
	lastRunAt: text("last_run_at"),
	/** Last run status: `success` | `fail` | null (never run). */
	lastRunStatus: text("last_run_status", {
		enum: ["success", "fail"],
	}),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// Inferred Types & Helper Types
export type BillingAccount = typeof accounts.$inferSelect;
export type NewBillingAccount = typeof accounts.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;

export type SyncCursor = typeof syncCursors.$inferSelect;
export type NewSyncCursor = typeof syncCursors.$inferInsert;

export type MemoryEvent = typeof memoryEvents.$inferSelect;
export type NewMemoryEvent = typeof memoryEvents.$inferInsert;

export type Connector = typeof connectors.$inferSelect;
export type NewConnector = typeof connectors.$inferInsert;

/**
 * The entitlement plan tier — the single source of truth for the plan union.
 */
export type PlanTier = "free" | "pro" | "teams";

/** The connector type union (github | notion at v1). */
export type ConnectorType = (typeof connectors.type.enumValues)[number];

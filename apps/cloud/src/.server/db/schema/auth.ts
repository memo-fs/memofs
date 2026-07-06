import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
// `accounts` table. Naming is unfortunate but both are the ecosystem
// default.

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

// Inferred Types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

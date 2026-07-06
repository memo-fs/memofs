import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../../tests/utils/db";
import type { Database } from "../../db";
import { accounts, apiKeys } from "../../db/schema";
import { hashApiKey } from "../../utils";
import { type ApiEnv, createApiApp, json } from "..";
import { createAuthMiddleware } from "../middleware/auth";

/**
 * Bearer-auth middleware tests.
 *
 * These run the REAL salted-hash + Drizzle join against an in-memory libSQL DB
 * seeded with accounts + api_keys rows — so they assert the actual SQL the ORM
 * emits and the actual lookup logic, not a mocked contract. The middleware is
 * mounted on a throwaway Hono app under the real `createApiApp()` spine so the
 * global onError/notFound + envelope contract are exercised end-to-end.
 *
 * §12.4 contract covered:
 *   - missing / malformed Authorization header → 401 `unauthorized`
 *   - non-`tm_` token shape → 401
 *   - unknown key hash → 401 (same code/message as a revoked key — no probing)
 *   - valid, non-revoked key → 200, `c.var.account` populated
 *   - revoked key (`revoked_at` set) → 401
 */

const SALT = "test-salt";
const STUB_ENV = { BLOBS: {} } as unknown as Env;

/** The raw key a client would send; we store its hash in the seed. */
const RAW_KEY = "tm_abcdef1234567890";
/** Wrong key to prove an unknown hash doesn't authenticate. */
const WRONG_KEY = "tm_zzzzzzzzzzzzzzzz";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
});

afterEach(async () => {
	// libSQL `:memory:` clients hold no durable state; closing releases the
	// in-process sqlite3 handle. Drizzle exposes the underlying client via
	// `.$client`.
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

/**
 * Builds an API app with the auth middleware guarding a probe route, so the
 * tests can assert both the success path (200 + account context) and every
 * failure path (401) through the real envelope/error serialization.
 */
function appWithAuth() {
	const app = createApiApp();
	app
		.use("/v1/projects/:projectId/*", createAuthMiddleware(db, SALT))
		.get("/v1/projects/:projectId/me", (c) => {
			const account = c.get("account");
			return json(c, account);
		});
	return app;
}

async function seedKey(opts: {
	accountId?: string;
	revokedAt?: string | null;
	rawKey?: string;
}): Promise<void> {
	const accountId = opts.accountId ?? "acct_test";
	const rawKey = opts.rawKey ?? RAW_KEY;
	const keyHash = await hashApiKey(rawKey, SALT);
	await db.insert(accounts).values({
		id: accountId,
		plan: "free",
		maxHostedStorageBytes: 1_000_000_000,
		maxConnectors: 1,
	});
	await db.insert(apiKeys).values({
		id: `key_${accountId}`,
		accountId,
		keyHash,
		label: "test",
		revokedAt: opts.revokedAt ?? null,
	});
}

async function fetchAuthed(
	app: Hono<ApiEnv>,
	path = "/v1/projects/proj_test/me",
	auth?: string,
): Promise<Response> {
	const res = await app.fetch(
		new Request(`http://memofs.test${path}`, {
			headers: auth ? { authorization: auth } : undefined,
		}),
		STUB_ENV,
	);
	return res as unknown as Response;
}

/** Parses a response body into the structural envelope view for assertions. */
async function jsonBody(res: Response) {
	return (await res.json()) as {
		data?: unknown;
		error?: { code: string; message: string; details?: unknown };
		meta?: { requestId?: string };
	};
}

describe("bearer auth middleware", () => {
	it("rejects a missing Authorization header with 401 unauthorized", async () => {
		await seedKey({});
		const res = await fetchAuthed(appWithAuth());
		expect(res.status).toBe(401);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("unauthorized");
		expect(body.error?.message).toBe(
			"Missing or malformed Authorization header.",
		);
	});

	it("rejects a non-Bearer scheme", async () => {
		await seedKey({});
		const res = await fetchAuthed(appWithAuth(), undefined, `Basic ${RAW_KEY}`);
		expect(res.status).toBe(401);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("unauthorized");
	});

	it("rejects a Bearer token that is not tm_… format", async () => {
		await seedKey({});
		const res = await fetchAuthed(
			appWithAuth(),
			undefined,
			"Bearer sk-not-ours",
		);
		expect(res.status).toBe(401);
	});

	it("rejects an unknown key hash (401, same code as revoked)", async () => {
		// Seed a valid key but present the WRONG one — the hash won't match.
		await seedKey({});
		const res = await fetchAuthed(
			appWithAuth(),
			undefined,
			`Bearer ${WRONG_KEY}`,
		);
		expect(res.status).toBe(401);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("unauthorized");
		// Message must NOT distinguish "unknown" from "revoked" — no probing signal.
		expect(body.error?.message).toBe("Invalid or revoked API key.");
	});

	it("rejects a revoked key (revoked_at set) with 401", async () => {
		await seedKey({ revokedAt: "2026-01-01T00:00:00Z" });
		const res = await fetchAuthed(
			appWithAuth(),
			undefined,
			`Bearer ${RAW_KEY}`,
		);
		expect(res.status).toBe(401);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("unauthorized");
		// Same message as an unknown key — revocation is indistinguishable.
		expect(body.error?.message).toBe("Invalid or revoked API key.");
	});

	it("authenticates a valid key and stamps the account on c.var", async () => {
		await seedKey({});
		const res = await fetchAuthed(
			appWithAuth(),
			undefined,
			`Bearer ${RAW_KEY}`,
		);
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			id: "acct_test",
			plan: "free",
			maxHostedStorageBytes: 1_000_000_000,
			maxConnectors: 1,
		});
		expect(body.meta?.requestId).toBeTypeOf("string");
	});

	it("respects per-key entitlements: a pro account loads its pro caps", async () => {
		await seedKey({
			accountId: "acct_pro",
			rawKey: "tm_prokey0000000000",
		});
		// Override the seeded account's plan + caps to pro values.
		await db
			.update(accounts)
			.set({
				plan: "pro",
				maxHostedStorageBytes: 25_000_000_000,
				maxConnectors: 3,
			})
			.where(eq(accounts.id, "acct_pro"));
		const res = await fetchAuthed(
			appWithAuth(),
			undefined,
			"Bearer tm_prokey0000000000",
		);
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			id: "acct_pro",
			plan: "pro",
			maxHostedStorageBytes: 25_000_000_000,
			maxConnectors: 3,
		});
	});
});

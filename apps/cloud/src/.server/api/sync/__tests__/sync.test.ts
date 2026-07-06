import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../../../tests/utils/db";
import { createFakeR2Bucket } from "../../../../../tests/utils/env";
import type { Database } from "../../../db";
import { accounts, apiKeys } from "../../../db/schema";
import { hashApiKey, sha256Hex } from "../../../utils";
import { type ApiEnv, createApiApp } from "../..";

/**
 * Sync handler tests — the four file-replication endpoints end-to-end.
 *
 * These run the REAL router (mounted through `createApiApp`) against an
 * in-memory libSQL DB seeded with accounts + api_keys, plus a fake R2 bucket
 * that stores blobs in a `Map` so the content-addressing verify step
 * (`verifyUploaded`) reads real bytes. The presign config uses throwaway creds;
 * URLs are never fetched here, only asserted to be present + structurally signed.
 *
 * Covers the §4.4/§4.5/§4.6 contract + decisions:
 *   - push auto-provisions a project (Q13) and returns presigned PUTs for diffs
 *   - complete verifies sha256 against R2, commits, bumps cursor (Q14)
 *   - complete 402s when projected storage exceeds the account cap (§12.3)
 *   - complete 409s when there was no prior push (no project)
 *   - pull returns presigned GETs + removed paths; empty for a missing project
 *   - status returns manifest + cursor + storageBytes; empty for missing
 *   - a key that doesn't own an existing project gets 403 on every handler
 *   - missing/invalid auth → 401; malformed body → 422
 */

const SALT = "test-salt";
const RAW_KEY = "tm_syncowner0000000";
const OTHER_KEY = "tm_otheraccount0000";
/** Tiny cap so the entitlement test can trip it with a few small files. */
const STORAGE_CAP = 1_000; // bytes

let db: Database;
/**
 * The fake R2 bucket + its backing blob store. The test seeds `blobs.set(...)`
 * directly to simulate a client having PUT bytes to R2; `complete` then verifies
 * them via `bucket.get(key)`, so the two MUST share the same Map reference.
 */
let bucket: ReturnType<typeof createFakeR2Bucket>["bucket"];
let blobs: ReturnType<typeof createFakeR2Bucket>["blobs"];

/** Test env with throwaway R2 creds + the fake bucket. */
function testEnv(): Env {
	return {
		BLOBS: bucket,
		DATABASE_URL: "memory:",
		API_KEY_SALT: SALT,
		R2_S3_ACCESS_KEY_ID: "AKIA_TEST_KEY_ID",
		R2_S3_SECRET_ACCESS_KEY: "test-secret-key-with-enough-length",
		R2_S3_ENDPOINT: "testacct.r2.cloudflarestorage.com",
		R2_BUCKET_NAME: "memofs-blobs",
		SESSION_SECRET: "test-session-secret",
	} as Env;
}

beforeEach(async () => {
	db = await createTestDb();
	const fake = createFakeR2Bucket();
	bucket = fake.bucket;
	blobs = fake.blobs;
});

afterEach(async () => {
	// Release the in-process sqlite3 handle backing the libSQL `:memory:` client.
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

/** Seeds an account + a non-revoked API key hashing to RAW_KEY. */
async function seedAccount(opts: {
	accountId?: string;
	rawKey?: string;
	maxBytes?: number;
}): Promise<string> {
	const accountId = opts.accountId ?? "acct_owner";
	const rawKey = opts.rawKey ?? RAW_KEY;
	const keyHash = await hashApiKey(rawKey, SALT);
	await db.insert(accounts).values({
		id: accountId,
		plan: "free",
		maxHostedStorageBytes: opts.maxBytes ?? STORAGE_CAP,
		maxConnectors: 1,
	});
	await db.insert(apiKeys).values({
		id: `key_${accountId}`,
		accountId,
		keyHash,
		label: "test",
		revokedAt: null,
	});
	return accountId;
}

/**
 * The real `createApiApp()` wrapped in an outer app that pre-seeds `c.var.db`
 * with our migrated in-memory test DB BEFORE the sync router runs.
 *
 * Ordering is load-bearing: `createApiApp()` registers `syncApp` (which carries
 * its own `dbMiddleware`) via `.route(...)`. A `use()` appended to that same
 * instance runs AFTER the matched sub-app's middleware — Hono dispatches in
 * registration order, and a `.route()` match short-circuits to its own chain
 * first. So `api.use("*", dbSetter)` added post-`createApiApp` runs too late:
 * the sync router's `dbMiddleware` has already called `createDb(c.env)` and
 * thrown on the `:memory:` URL.
 *
 * Mounting the setter on an OUTER app that then delegates to `createApiApp()`
 * runs it first in the dispatch chain. The sync router's `dbMiddleware` then
 * sees `c.get("db")` already set and skips `createDb(c.env)` (its documented
 * seam), so handlers run against the real libSQL client the tests seed, not a
 * Worker-binding client. Production mounts only `createApiApp()` — this outer
 * wrapper is a test-only seam for DB injection.
 */
function app() {
	const outer = new Hono<ApiEnv>();
	outer.use("*", (c, next) => {
		c.set("db", db);
		return next();
	});
	outer.route("/", createApiApp());
	return outer;
}

/** Fetches a sync route as the owner (authed). */
async function syncFetch(
	path: string,
	init?: RequestInit & { auth?: string },
): Promise<Response> {
	const headers = new Headers(init?.headers);
	headers.set("authorization", init?.auth ?? `Bearer ${RAW_KEY}`);
	if (init?.body && !headers.has("content-type")) {
		headers.set("content-type", "application/json");
	}
	const res = await app().fetch(
		new Request(`http://memofs.test${path}`, {
			...init,
			headers,
		}),
		testEnv(),
	);
	return res as unknown as Response;
}

/** sha256 hex of `content`, used as both the file identity and the R2 key. */
async function sha(content: string): Promise<string> {
	return sha256Hex(content);
}

/** Structural envelope view for assertions. `data` is intentionally `any` — the
 * shape varies per endpoint and tests assert on ad-hoc nested fields. */
async function jsonBody(res: Response) {
	return (await res.json()) as {
		// biome-ignore lint/suspicious/noExplicitAny: test-only envelope; shape varies per endpoint
		data?: any;
		error?: { code: string; message: string; details?: unknown };
		meta?: { requestId?: string };
	};
}

/** Pushes the given local manifest for `projectId`. */
async function push(
	projectId: string,
	manifest: Record<string, string>,
	auth?: string,
) {
	return syncFetch(`/v1/projects/${projectId}/sync/push`, {
		method: "POST",
		body: JSON.stringify({ manifest }),
		auth,
	});
}

/**
 * Seeds an R2 blob for each `{ path → content }` under its sha256 key, then
 * calls `/sync/push/complete` reporting those uploads. Returns the response.
 */
async function completeWith(
	projectId: string,
	files: Array<{ path: string; content: string }>,
	auth?: string,
) {
	const uploaded: Array<{ path: string; sha256: string }> = [];
	for (const f of files) {
		const digest = await sha(f.content);
		blobs.set(digest, {
			body: new TextEncoder().encode(f.content),
			size: f.content.length,
		});
		uploaded.push({ path: f.path, sha256: digest });
	}
	return syncFetch(`/v1/projects/${projectId}/sync/push/complete`, {
		method: "POST",
		body: JSON.stringify({ uploaded }),
		auth,
	});
}

// ---------------------------------------------------------------------------
// Auth + validation gates
// ---------------------------------------------------------------------------

describe("sync auth + validation", () => {
	it("rejects a request with no Authorization header (401)", async () => {
		const res = await syncFetch("/v1/projects/proj_a/sync/status", {
			auth: "",
		});
		expect(res.status).toBe(401);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("unauthorized");
	});

	it("rejects a malformed push body with 422", async () => {
		await seedAccount({});
		// manifest missing entirely
		const res = await syncFetch("/v1/projects/proj_a/sync/push", {
			method: "POST",
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(400);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("validation_error");
	});

	it("rejects a push manifest value that isn't a sha256 (422)", async () => {
		await seedAccount({});
		const res = await push("proj_a", { ".memofs/core.md": "not-a-sha" });
		expect(res.status).toBe(400);
	});

	it("rejects an uploaded[] that isn't an array (422)", async () => {
		await seedAccount({});
		const res = await syncFetch("/v1/projects/proj_a/sync/push/complete", {
			method: "POST",
			body: JSON.stringify({ uploaded: "nope" }),
		});
		expect(res.status).toBe(400);
	});
});

// ---------------------------------------------------------------------------
// Push + complete round-trip (the happy path)
// ---------------------------------------------------------------------------

describe("push → complete round-trip", () => {
	it("auto-provisions a project on first push (Q13) and issues PUT URLs for diffs", async () => {
		await seedAccount({});
		const digest = await sha("hello");
		const res = await push("proj_new", { ".memofs/core.md": digest });
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		// One upload target: the path the cloud doesn't have yet.
		expect(body.data.upload).toHaveLength(1);
		expect(body.data.upload[0]).toMatchObject({
			path: ".memofs/core.md",
			sha256: digest,
		});
		expect(body.data.upload[0].presignedPutUrl).toContain(
			"memofs-blobs.testacct.r2.cloudflarestorage.com",
		);
		// Fresh project → cursor is the initial sentinel before any commit.
		expect(body.data.cursor).toBe("0");
	});

	it("returns NO uploads when the cloud already has every path at the same sha", async () => {
		await seedAccount({});
		const digest = await sha("hello");
		// First push + complete to seed the cloud manifest.
		await push("proj_x", { ".memofs/core.md": digest });
		await completeWith("proj_x", [
			{ path: ".memofs/core.md", content: "hello" },
		]);
		// Second push with the same manifest → nothing to upload.
		const res = await push("proj_x", { ".memofs/core.md": digest });
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data.upload).toHaveLength(0);
	});

	it("commits a complete, bumps the cursor to 1, and surfaces the file in the manifest", async () => {
		await seedAccount({});
		await push("proj_y", { ".memofs/core.md": await sha("hello") });
		const res = await completeWith("proj_y", [
			{ path: ".memofs/core.md", content: "hello" },
		]);
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data.cursor).toBe("1"); // first commit
		expect(body.data.manifest).toMatchObject({
			".memofs/core.md": expect.objectContaining({
				sha256: await sha("hello"),
				sizeBytes: 5,
			}),
		});
	});

	it("rejects complete when the uploaded blob's sha256 doesn't match (409)", async () => {
		await seedAccount({});
		const claimed = await sha("hello");
		await push("proj_bad", { ".memofs/core.md": claimed });
		// Seed a blob whose content does NOT hash to `claimed`.
		const realDigest = await sha("different-bytes");
		blobs.set(realDigest, {
			body: new TextEncoder().encode("different-bytes"),
			size: "different-bytes".length,
		});
		const res = await syncFetch("/v1/projects/proj_bad/sync/push/complete", {
			method: "POST",
			body: JSON.stringify({
				uploaded: [{ path: ".memofs/core.md", sha256: claimed }],
			}),
		});
		expect(res.status).toBe(409);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("conflict");
	});

	it("rejects complete when the blob is absent from R2 (409)", async () => {
		await seedAccount({});
		await push("proj_missing", { ".memofs/core.md": await sha("hello") });
		// Don't seed any blob — verify must 409.
		const res = await syncFetch(
			"/v1/projects/proj_missing/sync/push/complete",
			{
				method: "POST",
				body: JSON.stringify({
					uploaded: [{ path: ".memofs/core.md", sha256: await sha("hello") }],
				}),
			},
		);
		expect(res.status).toBe(409);
	});

	it("rejects complete with 409 when there was no prior push (no project)", async () => {
		await seedAccount({});
		const res = await syncFetch("/v1/projects/proj_nopush/sync/push/complete", {
			method: "POST",
			body: JSON.stringify({
				uploaded: [{ path: ".memofs/core.md", sha256: await sha("hello") }],
			}),
		});
		expect(res.status).toBe(409);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("conflict");
	});
});

// ---------------------------------------------------------------------------
// Ownership (403)
// ---------------------------------------------------------------------------

describe("ownership enforcement", () => {
	it("403s when a second account's key touches a project the first owns", async () => {
		await seedAccount({ accountId: "acct_owner" });
		await seedAccount({
			accountId: "acct_other",
			rawKey: OTHER_KEY,
		});
		// Owner provisions + commits proj_shared.
		await push("proj_shared", { ".memofs/core.md": await sha("a") });
		await completeWith("proj_shared", [
			{ path: ".memofs/core.md", content: "a" },
		]);
		// Other account's key tries status → 403.
		const res = await syncFetch("/v1/projects/proj_shared/sync/status", {
			auth: `Bearer ${OTHER_KEY}`,
		});
		expect(res.status).toBe(403);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("forbidden");
	});

	it("403s on pull and push for a non-owner", async () => {
		await seedAccount({ accountId: "acct_owner" });
		await seedAccount({ accountId: "acct_other", rawKey: OTHER_KEY });
		await push("proj_p", { ".memofs/core.md": await sha("a") });
		await completeWith("proj_p", [{ path: ".memofs/core.md", content: "a" }]);

		const pullRes = await syncFetch("/v1/projects/proj_p/sync/pull", {
			method: "POST",
			body: JSON.stringify({}),
			auth: `Bearer ${OTHER_KEY}`,
		});
		expect(pullRes.status).toBe(403);

		const pushRes = await push(
			"proj_p",
			{ ".memofs/core.md": await sha("b") },
			`Bearer ${OTHER_KEY}`,
		);
		expect(pushRes.status).toBe(403);
	});
});

// ---------------------------------------------------------------------------
// Entitlement gate (402)
// ---------------------------------------------------------------------------

describe("entitlement gate (§12.3)", () => {
	it("402s when the projected storage exceeds the account cap", async () => {
		await seedAccount({ maxBytes: 3 }); // very tight cap
		await push("proj_cap", { ".memofs/core.md": await sha("hello") });
		// "hello" is 5 bytes > 3-byte cap → complete must 402.
		const res = await completeWith("proj_cap", [
			{ path: ".memofs/core.md", content: "hello" },
		]);
		expect(res.status).toBe(402);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("entitlement_limit_exceeded");
		expect(body.error?.details).toMatchObject({
			limit: "storage",
			max: 3,
			plan: "free",
		});
	});

	it("commits when projected storage is under the cap", async () => {
		await seedAccount({ maxBytes: 100 });
		await push("proj_ok", { ".memofs/core.md": await sha("hi") });
		const res = await completeWith("proj_ok", [
			{ path: ".memofs/core.md", content: "hi" },
		]);
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data.cursor).toBe("1");
	});
});

// ---------------------------------------------------------------------------
// Pull + status (incl. empty-for-missing-project, Q13)
// ---------------------------------------------------------------------------

describe("pull", () => {
	it("returns presigned GET URLs + the cloud manifest for files the client lacks", async () => {
		await seedAccount({});
		await push("proj_pull", { ".memofs/core.md": await sha("data") });
		await completeWith("proj_pull", [
			{ path: ".memofs/core.md", content: "data" },
		]);
		// Client pulls with an empty manifest → should get the one file.
		const res = await syncFetch("/v1/projects/proj_pull/sync/pull", {
			method: "POST",
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data.files).toHaveLength(1);
		expect(body.data.files[0]).toMatchObject({
			path: ".memofs/core.md",
			sizeBytes: 4,
		});
		expect(body.data.files[0].presignedGetUrl).toContain(
			"memofs-blobs.testacct.r2.cloudflarestorage.com",
		);
		expect(body.data.removed).toEqual([]);
		expect(body.data.cursor).toBe("1");
	});

	it("excludes files the client already has at the same sha", async () => {
		await seedAccount({});
		const digest = await sha("data");
		await push("proj_pull2", { ".memofs/core.md": digest });
		await completeWith("proj_pull2", [
			{ path: ".memofs/core.md", content: "data" },
		]);
		// Client claims it already has core.md at the same sha.
		const res = await syncFetch("/v1/projects/proj_pull2/sync/pull", {
			method: "POST",
			body: JSON.stringify({ manifest: { ".memofs/core.md": digest } }),
		});
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data.files).toHaveLength(0);
	});

	it("reports removed paths the client holds but the cloud deleted", async () => {
		await seedAccount({});
		// Cloud has only core.md; client (wrongly) holds both core.md + stale.md.
		const coreDigest = await sha("data");
		const staleDigest = await sha("stale");
		await push("proj_rem", { ".memofs/core.md": coreDigest });
		await completeWith("proj_rem", [
			{ path: ".memofs/core.md", content: "data" },
		]);
		const res = await syncFetch("/v1/projects/proj_rem/sync/pull", {
			method: "POST",
			body: JSON.stringify({
				manifest: {
					".memofs/core.md": coreDigest,
					".memofs/stale.md": staleDigest,
				},
			}),
		});
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data.removed).toEqual([".memofs/stale.md"]);
	});

	it("returns an empty result for a project that was never pushed (Q13)", async () => {
		await seedAccount({});
		const res = await syncFetch("/v1/projects/proj_empty/sync/pull", {
			method: "POST",
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			files: [],
			removed: [],
			cursor: "0",
			manifest: {},
		});
	});
});

describe("status", () => {
	it("returns the manifest, cursor, and storage bytes for a pushed project", async () => {
		await seedAccount({});
		await push("proj_st", { ".memofs/core.md": await sha("data") });
		await completeWith("proj_st", [
			{ path: ".memofs/core.md", content: "data" },
		]);
		const res = await syncFetch("/v1/projects/proj_st/sync/status");
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			cursor: "1",
			storageBytes: 4,
			manifest: {
				".memofs/core.md": expect.objectContaining({
					sha256: await sha("data"),
				}),
			},
		});
		expect(body.data.lastSyncAt).toBeTypeOf("string");
	});

	it("returns an empty result for a not-yet-pushed project (Q13)", async () => {
		await seedAccount({});
		const res = await syncFetch("/v1/projects/proj_none/sync/status");
		expect(res.status).toBe(200);
		const body = await jsonBody(res);
		expect(body.data).toMatchObject({
			cursor: "0",
			storageBytes: 0,
			manifest: {},
		});
		expect(body.data.lastSyncAt).toBeUndefined();
	});
});

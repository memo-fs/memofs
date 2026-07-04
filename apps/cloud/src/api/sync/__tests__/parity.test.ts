import type { TekMemoCloudFetch } from "@tekmemo/core/cloud-client";
import { createTekMemoCloudClient } from "@tekmemo/core/cloud-client";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../../db/index.server";
import { accounts, apiKeys } from "../../../db/schema";
import type { CloudWorkerEnv } from "../../../server/env";
import { hashApiKey, sha256Hex } from "../../../server/sha256";
import { createFakeR2Bucket } from "../../../test-utils/env";
import { createTestDb } from "../../../test-utils/db";
import { type ApiEnv, createApiApp } from "../..";

/**
 * @file Client ↔ server wire-parity round-trip.
 *
 * `sync.test.ts` proves the four handlers behave correctly when driven by raw
 * `fetch()` calls shaped by hand. This file proves the *other* half of the
 * contract: the published `@tekmemo/core/cloud-client` (the frozen surface
 * every SDK consumer imports) and the cloud server agree on the wire — so a
 * real client driving the real server round-trips a file set end-to-end.
 *
 * The seam is a `fetch` adapter: the client is constructed with a custom
 * `fetch` that forwards every outgoing request into `createApiApp().fetch()`.
 * No network, no Worker runtime — the HTTP layer is the only thing mocked, and
 * even that is a thin pass-through so the client's real URL building, header
 * construction, envelope unwrapping, and error decoding all run.
 *
 * The round-trip covers the full file-replication lifecycle a CLI/MCP sync
 * actually performs:
 *   1. `health`         — anonymous liveness (no key, no project).
 *   2. `sync.push`      — client manifest → server diffs → presigned PUT URLs.
 *   3. (PUT to R2)      — the client uploads blobs; here we write into the fake
 *      bucket the server's `verifyUploaded` will read back on `complete`.
 *   4. `sync.complete`  — server verifies sha256, commits, bumps cursor.
 *   5. `sync.pull`      — a fresh client (empty manifest) downloads everything.
 *   6. `sync.status`    — manifest + cursor + storage bytes agree post-commit.
 *
 * This is the test that fails if the client and server drift on a field name,
 * a cursor format, an envelope shape, or a status code — the things a unit test
 * on either side alone can't catch.
 */

const SALT = "parity-salt";
const RAW_KEY = "tm_parity0000000000";
// `http://localhost` is the one non-https host the client's baseUrl validator
// permits (self-hosted dev carve-out). The host is irrelevant here — requests
// are bridged straight into the Hono app — but the validator runs regardless.
const BASE_URL = "http://localhost/v1";
const PROJECT_ID = "proj_parity";

let db: Database;
/**
 * Fake R2 bucket shared by the server env + the "upload" step. The client's
 * PUT target URLs point at R2; in production the client fetches them directly.
 * Here we skip the HTTP hop and write straight into the bucket the server will
 * `get()` from during `complete`'s verify pass — so the bucket + `blobs` MUST
 * share the same Map reference.
 */
let bucket: ReturnType<typeof createFakeR2Bucket>["bucket"];
let blobs: ReturnType<typeof createFakeR2Bucket>["blobs"];

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

function testEnv(): CloudWorkerEnv {
	return {
		BLOBS: bucket,
		DATABASE_URL: "memory:",
		TEKMEMO_API_KEY_SALT: SALT,
		R2_S3_ACCESS_KEY_ID: "AKIA_TEST_KEY_ID",
		R2_S3_SECRET_ACCESS_KEY: "test-secret-key-with-enough-length",
		R2_S3_ENDPOINT: "testacct.r2.cloudflarestorage.com",
		R2_BUCKET_NAME: "tekmemo-blobs",
		SESSION_SECRET: "test-session-secret",
	} as CloudWorkerEnv;
}

/**
 * The server, with the test DB injected via an outer app so the sync router's
 * `dbMiddleware` honors the pre-set `c.var.db` (see sync.test.ts for the
 * ordering rationale — appending to `createApiApp()` runs too late).
 */
function server() {
	const outer = new Hono<ApiEnv>();
	outer.use("*", (c, next) => {
		c.set("db", db);
		return next();
	});
	outer.route("/", createApiApp());
	return outer;
}

/**
 * The client-side `fetch` bridge: forwards the client's outgoing request into
 * the Hono app's `fetch()`. The client hands us `(url, init)`; we reconstruct a
 * `Request` and dispatch it against the server with the test env. Hono returns a
 * real `Response`, which already satisfies the `{ ok, status, headers, text }`
 * shape the transport reads — so no marshaling is needed on the way back.
 */
function fetchIntoServer(): TekMemoCloudFetch {
	const app = server();
	return async (url, init) => {
		const request = new Request(String(url), init);
		return (await app.fetch(request, testEnv())) as unknown as Response;
	};
}

/** Builds the real published client wired to the in-process server. */
function client() {
	return createTekMemoCloudClient({
		baseUrl: BASE_URL,
		apiKey: RAW_KEY,
		defaultProjectId: PROJECT_ID,
		fetch: fetchIntoServer(),
		// No retry: parity assertions want the exact response, not a masked retry.
		retry: false,
	});
}

/** Seeds the owner account + a live API key hashing to RAW_KEY. */
async function seedOwner(maxBytes = 10_000_000): Promise<void> {
	const keyHash = await hashApiKey(RAW_KEY, SALT);
	await db.insert(accounts).values({
		id: "acct_owner",
		plan: "free",
		maxHostedStorageBytes: maxBytes,
		maxConnectors: 1,
	});
	await db.insert(apiKeys).values({
		id: "key_owner",
		accountId: "acct_owner",
		keyHash,
		label: "parity",
		revokedAt: null,
	});
}

describe("client ↔ server wire parity (round-trip)", () => {
	it("health is anonymous and unwraps the { data, meta } envelope", async () => {
		await seedOwner();
		// No API key on this client — health must not require one.
		const anon = createTekMemoCloudClient({
			baseUrl: BASE_URL,
			fetch: fetchIntoServer(),
			requireApiKey: false,
		});
		const result = await anon.health();
		expect(result.ok).toBe(true);
		expect(result.name).toBe("tekmemo-cloud");
	});

	it("round-trips a file set: push → upload → complete → pull → status", async () => {
		await seedOwner();
		const c = client();

		// Two canonical files the local engine would have on disk.
		const coreContent = "# Core Memory\n";
		const notesContent = "## Notes\nparity round-trip\n";
		const coreSha = await sha256Hex(coreContent);
		const notesSha = await sha256Hex(notesContent);
		const localManifest = {
			".tekmemo/core.md": coreSha,
			".tekmemo/notes.md": notesSha,
		};

		// 1) PUSH — server diffs against an empty cloud manifest, asks for both.
		const pushResult = await c.sync.push({ manifest: localManifest });
		expect(pushResult.cursor).toBe("0"); // pre-commit cursor
		const toUpload = pushResult.upload;
		expect(toUpload).toHaveLength(2);
		// Every requested upload must carry a signed PUT URL.
		for (const entry of toUpload) {
			expect(entry.presignedPutUrl).toContain(
				"tekmemo-blobs.testacct.r2.cloudflarestorage.com",
			);
		}

		// 2) UPLOAD — the client would PUT each blob to its presigned URL. We skip
		// the HTTP hop and stage the bytes directly into the bucket the server
		// reads from during complete's verify pass. Content-addressed: key = sha.
		blobs.set(coreSha, {
			body: new TextEncoder().encode(coreContent),
			size: coreContent.length,
		});
		blobs.set(notesSha, {
			body: new TextEncoder().encode(notesContent),
			size: notesContent.length,
		});

		// 3) COMPLETE — server verifies each sha against R2, commits, bumps cursor.
		const completeResult = await c.sync.complete({
			uploaded: [
				{ path: ".tekmemo/core.md", sha256: coreSha },
				{ path: ".tekmemo/notes.md", sha256: notesSha },
			],
			cursor: pushResult.cursor,
		});
		expect(completeResult.cursor).toBe("1");
		// The committed manifest is returned in the cloud shape the client type
		// expects: path → { sha256, sizeBytes, updatedAt, ... }.
		expect(completeResult.manifest[".tekmemo/core.md"]?.sha256).toBe(coreSha);
		expect(completeResult.manifest[".tekmemo/core.md"]?.sizeBytes).toBe(
			coreContent.length,
		);
		expect(completeResult.manifest[".tekmemo/notes.md"]?.sha256).toBe(notesSha);

		// 4) PULL — a second client with an empty manifest pulls everything down.
		const pullResult = await c.sync.pull({});
		expect(pullResult.cursor).toBe("1");
		expect(pullResult.files).toHaveLength(2);
		const pulledPaths = pullResult.files.map((f) => f.path).sort();
		expect(pulledPaths).toEqual([".tekmemo/core.md", ".tekmemo/notes.md"]);
		for (const file of pullResult.files) {
			expect(file.presignedGetUrl).toContain(
				"tekmemo-blobs.testacct.r2.cloudflarestorage.com",
			);
		}
		// Nothing the client holds has been removed server-side.
		expect(pullResult.removed).toEqual([]);

		// 5) STATUS — manifest, cursor, and storage bytes agree post-commit.
		const status = await c.sync.status();
		expect(status.cursor).toBe("1");
		expect(status.storageBytes).toBe(coreContent.length + notesContent.length);
		expect(status.manifest[".tekmemo/core.md"]?.sha256).toBe(coreSha);
		expect(status.lastSyncAt).toBeTypeOf("string");
	});

	it("a second push with no changes asks the client to upload nothing", async () => {
		await seedOwner();
		const c = client();
		const content = "stable\n";
		const digest = await sha256Hex(content);

		// Seed the cloud with one file.
		await c.sync.push({
			manifest: { ".tekmemo/core.md": digest },
		});
		blobs.set(digest, {
			body: new TextEncoder().encode(content),
			size: content.length,
		});
		await c.sync.complete({
			uploaded: [{ path: ".tekmemo/core.md", sha256: digest }],
			cursor: "0",
		});

		// Re-push the SAME manifest → server already has this sha at this path.
		const second = await c.sync.push({
			manifest: { ".tekmemo/core.md": digest },
		});
		expect(second.upload).toEqual([]);
	});

	it("pull reports a path the client holds but the cloud no longer has", async () => {
		await seedOwner();
		const c = client();
		const coreDigest = await sha256Hex("core\n");
		const staleDigest = await sha256Hex("stale\n");

		// Cloud only has core.md.
		await c.sync.push({ manifest: { ".tekmemo/core.md": coreDigest } });
		blobs.set(coreDigest, {
			body: new TextEncoder().encode("core\n"),
			size: "core\n".length,
		});
		await c.sync.complete({
			uploaded: [{ path: ".tekmemo/core.md", sha256: coreDigest }],
			cursor: "0",
		});

		// Client (wrongly) believes it also holds stale.md.
		const pulled = await c.sync.pull({
			manifest: {
				".tekmemo/core.md": coreDigest,
				".tekmemo/stale.md": staleDigest,
			},
		});
		expect(pulled.removed).toEqual([".tekmemo/stale.md"]);
		// core.md matches → no download needed.
		expect(pulled.files).toEqual([]);
	});

	it("complete surfaces a typed ConflictError when a blob is missing from R2", async () => {
		await seedOwner();
		const c = client();
		const claimed = await sha256Hex("never-uploaded");

		// Push to provision the project, but DON'T stage the blob.
		await c.sync.push({ manifest: { ".tekmemo/core.md": claimed } });

		// Complete → server's verify pass finds no object at the sha key → 409.
		await expect(
			c.sync.complete({
				uploaded: [{ path: ".tekmemo/core.md", sha256: claimed }],
				cursor: "0",
			}),
		).rejects.toMatchObject({
			code: "conflict",
			status: 409,
		});
	});

	it("complete surfaces a typed EntitlementError when storage exceeds the cap", async () => {
		// 3-byte cap: "hello" (5 bytes) blows it on the first complete.
		await seedOwner(3);
		const c = client();
		const digest = await sha256Hex("hello");

		await c.sync.push({ manifest: { ".tekmemo/core.md": digest } });
		blobs.set(digest, {
			body: new TextEncoder().encode("hello"),
			size: "hello".length,
		});

		await expect(
			c.sync.complete({
				uploaded: [{ path: ".tekmemo/core.md", sha256: digest }],
				cursor: "0",
			}),
		).rejects.toMatchObject({
			code: "entitlement_limit_exceeded",
			status: 402,
		});
	});

	it("a missing Authorization header surfaces as a typed AuthError (401)", async () => {
		await seedOwner();
		// Client with no key — the transport still sends the request (requireApiKey
		// defaults true, but the error class is what we're asserting at the wire).
		const unauthed = createTekMemoCloudClient({
			baseUrl: BASE_URL,
			defaultProjectId: PROJECT_ID,
			fetch: fetchIntoServer(),
			// Force a request despite no key so the SERVER is what rejects it.
			requireApiKey: false,
		});
		await expect(unauthed.sync.status()).rejects.toMatchObject({
			code: "unauthorized",
			status: 401,
		});
	});
});

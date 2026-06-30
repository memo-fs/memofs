import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../../db/index.server";
import {
	accounts,
	apiKeys,
	projectFiles,
	syncCursors,
} from "../../../db/schema";
import type { CloudWorkerEnv } from "../../../server/env";
import { hashApiKey, sha256Hex } from "../../../server/sha256";
import { createFakeR2Bucket } from "../../../test-utils/env";
import { createTestDb } from "../../../test-utils/db";
import { type ApiEnv, createApiApp } from "../..";
import { ConcurrencyError, isApiError } from "../../errors";
import { classify, isLockTimeout } from "../concurrency";

/**
 * Cloud concurrency-control tests — ADR 0010 (Phase 1).
 *
 * These exercise the write-serialization layer that makes multi-agent writes to
 * one project safe (the B3 "one memory, many agents" model):
 *
 *   - sequential pushes produce distinct, monotonic cursors (no dup `seq`)
 *   - concurrent `push/complete` calls never collide on `seq` or lose a manifest
 *     entry (the `BEGIN IMMEDIATE` queue serializes them)
 *   - a stale `baseCursor` is rejected with 409 + the current cursor (optimistic
 *     gate), so the client re-diffs instead of silently overwriting
 *   - a current (or omitted) `baseCursor` commits normally (no false rejects —
 *     single-user sync is unaffected)
 *   - a libSQL write-lock timeout surfaces as 503 + Retry-After (unit test of
 *     `classify()` / `isLockTimeout()` with a synthetic error)
 *
 * The concurrency tests fire N `push/complete` requests in parallel against the
 * in-memory libSQL client and assert the union of their writes all landed and
 * the cursors form a contiguous sequence — i.e. no write was lost and no two
 * commits share a cursor.
 *
 * @see docs/adr/0010-cloud-concurrency-control-for-b3.md
 * @see src/api/sync/concurrency.ts — `acquireWriteLock` + `classify`.
 * @see src/api/sync/shared.ts — `commitPushTx` (the in-tx commit).
 */

const SALT = "test-salt";
const RAW_KEY = "tm_concowner0000000";
/** Roomy cap so the concurrency tests can write many files without tripping 402. */
const STORAGE_CAP = 10_000_000; // bytes

let db: Database;
/**
 * The fake R2 bucket + its backing blob store. `blobs.set(...)` simulates a
 * client PUT so `complete`'s `bucket.get(key)` verify reads real bytes — the two
 * MUST share the same Map reference (see sync.test.ts for the full rationale).
 */
let bucket: ReturnType<typeof createFakeR2Bucket>["bucket"];
let blobs: ReturnType<typeof createFakeR2Bucket>["blobs"];

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

/** Seeds the owner account + a non-revoked API key hashing to RAW_KEY. */
async function seedOwner(): Promise<void> {
	const keyHash = await hashApiKey(RAW_KEY, SALT);
	await db.insert(accounts).values({
		id: "acct_owner",
		plan: "free",
		maxHostedStorageBytes: STORAGE_CAP,
		maxConnectors: 1,
	});
	await db.insert(apiKeys).values({
		id: "key_owner",
		accountId: "acct_owner",
		keyHash,
		label: "test",
		revokedAt: null,
	});
}

/**
 * The real `createApiApp()` wrapped in an outer app that pre-seeds `c.var.db`.
 * Mirrors the seam in sync.test.ts (see its JSDoc): the outer `use()` runs first
 * so the sync router's `dbMiddleware` sees the test DB already bound.
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
		new Request(`http://tekmemo.test${path}`, { ...init, headers }),
		testEnv(),
	);
	return res as unknown as Response;
}

/** sha256 hex of `content` — the file identity AND the content-addressed R2 key. */
async function sha(content: string): Promise<string> {
	return sha256Hex(content);
}

/** Envelope view for assertions. */
async function jsonBody(res: Response) {
	return (await res.json()) as {
		// biome-ignore lint/suspicious/noExplicitAny: test-only envelope; shape varies
		data?: any;
		error?: { code: string; message: string; details?: unknown };
		meta?: { requestId?: string };
	};
}

/** Seeds an R2 blob for each file under its sha256 key, returns the `uploaded[]`. */
async function seedBlobs(
	files: Array<{ path: string; content: string }>,
): Promise<Array<{ path: string; sha256: string }>> {
	const uploaded: Array<{ path: string; sha256: string }> = [];
	for (const f of files) {
		const digest = await sha(f.content);
		blobs.set(digest, {
			body: new TextEncoder().encode(f.content),
			size: f.content.length,
		});
		uploaded.push({ path: f.path, sha256: digest });
	}
	return uploaded;
}

/** Calls `/sync/push/complete` with the given `uploaded[]` and optional `cursor`. */
async function complete(
	projectId: string,
	uploaded: Array<{ path: string; sha256: string }>,
	opts: { cursor?: string } = {},
) {
	const body: { uploaded: typeof uploaded; cursor?: string } = { uploaded };
	if (opts.cursor !== undefined) body.cursor = opts.cursor;
	return syncFetch(`/v1/projects/${projectId}/sync/push/complete`, {
		method: "POST",
		body: JSON.stringify(body),
	});
}

/** Seeds the project + a first commit so subsequent calls have a real cursor. */
async function provision(projectId: string): Promise<{ cursor: string }> {
	// First push auto-provisions the project (Q13).
	await syncFetch(`/v1/projects/${projectId}/sync/push`, {
		method: "POST",
		body: JSON.stringify({ manifest: {} }),
	});
	const uploaded = await seedBlobs([
		{ path: ".tekmemo/seed.md", content: "seed" },
	]);
	const res = await complete(projectId, uploaded);
	const body = await jsonBody(res);
	return { cursor: String(body.data?.cursor ?? "0") };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sync concurrency (ADR 0010)", () => {
	it("sequential pushes produce distinct, monotonic cursors", async () => {
		await seedOwner();
		const projectId = "proj_seq";

		// Provision + 3 sequential commits. Each must advance the cursor by 1.
		const first = await provision(projectId);
		expect(Number(first.cursor)).toBe(1);

		const cursors: number[] = [Number(first.cursor)];
		for (let i = 0; i < 3; i++) {
			const uploaded = await seedBlobs([
				{ path: `.tekmemo/f${i}.md`, content: `content-${i}` },
			]);
			const res = await complete(projectId, uploaded);
			expect(res.status).toBe(200);
			const body = await jsonBody(res);
			cursors.push(Number(body.data.cursor));
		}

		// Strictly increasing by exactly 1 each commit, no gaps or duplicates.
		for (let i = 1; i < cursors.length; i++) {
			expect(cursors[i]).toBe(cursors[i - 1] + 1);
		}
		// Sanity: the cursors are all distinct.
		expect(new Set(cursors).size).toBe(cursors.length);
	});

	it("concurrent push/complete calls never collide on seq or lose entries", async () => {
		await seedOwner();
		const projectId = "proj_concurrent";

		// Provision so the first concurrent batch has a real base cursor.
		await provision(projectId);

		// Fire N concurrent commits, each to a DISTINCT path. Under serialization
		// every path lands exactly once and the cursors form a contiguous sequence.
		const N = 5;
		const commits = await Promise.all(
			Array.from({ length: N }, (_, i) =>
				seedBlobs([
					{ path: `.tekmemo/agent${i}.md`, content: `agent-${i}-body` },
				]).then((uploaded) => complete(projectId, uploaded)),
			),
		);

		// Every commit succeeds (no 5xx, no lost-write 409 — distinct paths, fresh
		// base cursor from provision).
		for (const res of commits) {
			expect(res.status).toBe(200);
		}

		// Collect the returned cursors — they must all be distinct.
		const returnedCursors = await Promise.all(
			commits.map(async (res) => Number((await jsonBody(res)).data.cursor)),
		);
		expect(new Set(returnedCursors).size).toBe(N);

		// Read the committed manifest + cursor rows straight from the DB — the
		// source of truth — and assert nothing was lost.
		const files = await db
			.select({ path: projectFiles.path })
			.from(projectFiles)
			.all();
		const agentPaths = files
			.map((f) => f.path)
			.filter((p) => p.startsWith(".tekmemo/agent"));
		expect(agentPaths.sort()).toEqual(
			Array.from({ length: N }, (_, i) => `.tekmemo/agent${i}.md`).sort(),
		);

		// The cursor rows form a contiguous sequence with no duplicate `seq`.
		const cursorRows = await db
			.select({ seq: syncCursors.seq })
			.from(syncCursors)
			.all();
		const seqs = cursorRows.map((r) => r.seq).sort((a, b) => a - b);
		const distinct = new Set(seqs);
		expect(distinct.size).toBe(seqs.length); // no dup seq
		// Contiguous from 1..max (provision seeded seq 1; N commits add 2..N+1).
		expect(seqs[0]).toBe(1);
		expect(seqs[seqs.length - 1]).toBe(N + 1);
		for (let i = 1; i < seqs.length; i++) {
			expect(seqs[i]).toBe(seqs[i - 1] + 1);
		}
	});

	it("rejects a stale baseCursor with 409 carrying the current cursor", async () => {
		await seedOwner();
		const projectId = "proj_stale";

		// Provision at cursor 1, then advance once more so the client's baseCursor
		// (1) is now stale.
		const initial = await provision(projectId);
		expect(Number(initial.cursor)).toBe(1);

		const advance = await seedBlobs([
			{ path: ".tekmemo/between.md", content: "between" },
		]);
		const advanced = await complete(projectId, advance);
		expect((await jsonBody(advanced)).data.cursor).toBe("2");

		// The client now tries to commit carrying its STALE baseCursor (1).
		const staleUpload = await seedBlobs([
			{ path: ".tekmemo/stale.md", content: "stale" },
		]);
		const res = await complete(projectId, staleUpload, { cursor: "1" });

		expect(res.status).toBe(409);
		const body = await jsonBody(res);
		expect(body.error?.code).toBe("conflict");
		// The details carry both what the client claimed and the truth.
		const details = body.error?.details as {
			baseCursor: string;
			currentCursor: string;
		};
		expect(details.baseCursor).toBe("1");
		expect(details.currentCursor).toBe("2");
		// The stale write did NOT land.
		const stale = await db
			.select({ path: projectFiles.path })
			.from(projectFiles)
			.where(eq(projectFiles.path, ".tekmemo/stale.md"))
			.all();
		expect(stale).toHaveLength(0);
	});

	it("commits normally when baseCursor is current (or omitted)", async () => {
		await seedOwner();
		const projectId = "proj_current";

		const initial = await provision(projectId);
		const baseCursor = initial.cursor; // current

		// Commit WITH the current cursor → 200.
		const okUpload = await seedBlobs([
			{ path: ".tekmemo/ok.md", content: "ok" },
		]);
		const okRes = await complete(projectId, okUpload, { cursor: baseCursor });
		expect(okRes.status).toBe(200);

		// Commit with NO cursor (single-user path) → 200.
		const omittedUpload = await seedBlobs([
			{ path: ".tekmemo/omitted.md", content: "omitted" },
		]);
		const omittedRes = await complete(projectId, omittedUpload);
		expect(omittedRes.status).toBe(200);

		// Both writes landed.
		const paths = (
			await db.select({ path: projectFiles.path }).from(projectFiles).all()
		).map((f) => f.path);
		expect(paths).toContain(".tekmemo/ok.md");
		expect(paths).toContain(".tekmemo/omitted.md");
	});

	it("classifies a libSQL write-lock timeout as 503 + Retry-After", () => {
		// `isLockTimeout` matches the canonical libSQL wording case-insensitively.
		expect(isLockTimeout(new Error("database is locked"))).toBe(true);
		expect(isLockTimeout(new Error("SQLITE_BUSY: transaction timed out"))).toBe(
			true,
		);
		expect(isLockTimeout(new Error("totally unrelated error"))).toBe(false);
		expect(isLockTimeout(null)).toBe(false);

		// `classify` turns a lock-timeout into a ConcurrencyError (503) and passes
		// everything else through verbatim.
		const concurrency = classify(new Error("database is locked"), "proj_x");
		expect(concurrency).toBeInstanceOf(ConcurrencyError);
		expect(isApiError(concurrency)).toBe(true);
		if (isApiError(concurrency)) {
			expect(concurrency.status).toBe(503);
			expect(concurrency.code).toBe("concurrency_locked");
			expect(concurrency.headers?.["retry-after"]).toBeTruthy();
		}

		const passthrough = new Error("something else entirely");
		expect(classify(passthrough, "proj_x")).toBe(passthrough);
	});
});

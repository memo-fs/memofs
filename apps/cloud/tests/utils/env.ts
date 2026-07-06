/**
 * Test environment SSOT for the cloud app.
 *
 * Sibling to {@link ./db}. Consolidates the three bindings-heavy fakes that
 * were copy-pasted across the sync/concurrency/parity/hosted-runtime suites:
 *
 *   - a Map-backed fake R2 `BLOBS` bucket (content-addressed by sha256);
 *   - a throwaway-cred `Env` assembled from the fake bucket.
 *
 * These run the REAL Hono app + handlers against an in-memory libSQL DB seeded
 * by {@link createTestDb}, exercising the actual SQL + manifest/blob logic
 * without live network calls. The Node-pool suites (vitest, `environment:
 * "node"`) use these today; the workers-pool integration suite
 * (`@cloudflare/vitest-pool-workers`) swaps them for a real R2 binding
 * served by miniflare — but the env-shape + bucket semantics stay identical, so
 * tests port across pools by changing only their import, not their assertions.
 *
 * @see {@link ./db} `createTestDb` — the per-test libSQL DB these fakes pair with.
 */

export interface FakeR2Store {
	/** `sha256 → { body, size }`. Shared by reference so the test can assert on it. */
	blobs: Map<string, { body: Uint8Array; size: number }>;
}

/**
 * Builds a fake R2 `BLOBS` bucket backed by a fresh `Map`.
 *
 * Implements the four methods the handlers actually call — `get` (verify),
 * `head` (readiness probe), `put` (hosted-runtime bootstrap/write), and a
 * no-op `delete`/`list` so the binding satisfies the ambient `R2Bucket` type.
 * The returned `{ bucket, blobs }` exposes the underlying store so a test can
 * assert a blob landed (`blobs.has(key)`) without reaching into the binding.
 *
 * @returns the bucket binding + its backing Map (for assertions).
 */
export function createFakeR2Bucket(): {
	bucket: Env["BLOBS"];
	blobs: FakeR2Store["blobs"];
} {
	const blobs: FakeR2Store["blobs"] = new Map();
	const bucket = {
		async get(key: string) {
			const entry = blobs.get(key);
			if (!entry) return null;
			return {
				size: entry.size,
				async arrayBuffer() {
					// Copy out of the Uint8Array's buffer at its byte offset so a
					// view backed by a larger buffer returns only its own bytes.
					return entry.body.buffer.slice(
						entry.body.byteOffset,
						entry.body.byteOffset + entry.body.byteLength,
					);
				},
			};
		},
		async put(key: string, body: BodyInit) {
			const bytes = await toArrayBuffer(body);
			const view = new Uint8Array(bytes);
			blobs.set(key, { body: view, size: view.byteLength });
		},
		async delete(key: string) {
			blobs.delete(key);
		},
		async head() {
			return null;
		},
		async list() {
			return { objects: [], delimitedPrefixes: [], truncated: false };
		},
	} as unknown as Env["BLOBS"];
	return { bucket, blobs };
}


/**
 * Coerces a `BodyInit` (the union R2 `put` accepts) into an `ArrayBuffer`.
 * Handles the three shapes the hosted runtime writes — `ArrayBuffer`,
 * `ArrayBufferView` (e.g. `Uint8Array`), and `Blob` — and throws on anything
 * else so an unexpected body type fails loud rather than silently storing `[]`.
 */
async function toArrayBuffer(body: BodyInit): Promise<ArrayBuffer> {
	if (body instanceof ArrayBuffer) return body;
	if (ArrayBuffer.isView(body)) {
		const view = body as Uint8Array;
		const copy = new ArrayBuffer(view.byteLength);
		new Uint8Array(copy).set(view);
		return copy;
	}
	if (typeof Blob !== "undefined" && body instanceof Blob) {
		return body.arrayBuffer();
	}
	throw new Error("unsupported R2 body type");
}

/**
 * Options for {@link createTestEnv}. Every field is optional — the base env
 * already carries every binding + throwaway credential a test needs; a test
 * overrides only the slot its assertion depends on (e.g. a tighter
 * `maxHostedStorageBytes` cap is set on the seeded account, not here).
 */
export type TestEnvOverrides = Partial<Env>;

/**
 * Assembles a full `Env` from throwaway credentials + a fresh fake
 * R2 bucket. Deep-merges caller overrides last, so a test can
 * swap any binding (e.g. hand-build a failing R2 for a readiness test) without
 * rebuilding the whole env.
 *
 * `DATABASE_URL` defaults to `"memory:"` so it composes with the in-process
 * libSQL client {@link createTestDb} builds — but the sync router constructs its
 * OWN drizzle client from `c.env`, so the `dbMiddleware` test seam pre-seeds
 * `c.var.db` instead and this URL is never actually connected to.
 *
 * @param overrides optional per-test binding/cred overrides.
 * @returns a `Env` ready to hand to `app.fetch(request, env)`.
 */
export function createTestEnv(
	overrides: TestEnvOverrides = {},
): Env {
	const { bucket } = createFakeR2Bucket();
	const base = {
		BLOBS: bucket,
		DATABASE_URL: "memory:",
		API_KEY_SALT: "test-salt",
		R2_S3_ACCESS_KEY_ID: "AKIA_TEST_KEY_ID",
		R2_S3_SECRET_ACCESS_KEY: "test-secret-key-with-enough-length",
		R2_S3_ENDPOINT: "testacct.r2.cloudflarestorage.com",
		R2_BUCKET_NAME: "memofs-blobs",
		BETTER_AUTH_SECRET: "test-better-auth-secret",
		BETTER_AUTH_URL: "http://localhost:5173",
		SESSION_SECRET: "test-session-secret",
	} as Env;
	return { ...base, ...overrides };
}

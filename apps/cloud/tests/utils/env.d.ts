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
    blobs: Map<string, {
        body: Uint8Array;
        size: number;
    }>;
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
export declare function createFakeR2Bucket(): {
    bucket: Env["BLOBS"];
    blobs: FakeR2Store["blobs"];
};
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
export declare function createTestEnv(overrides?: TestEnvOverrides): Env;

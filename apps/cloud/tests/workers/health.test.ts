/**
 * Integration smoke test — the cloud API against REAL Cloudflare bindings.
 *
 * This is the single proof the `cloud-workers` pool exists for: the handlers that
 * the node unit suite drives against a Map-backed fake R2 (`createFakeR2Bucket`)
 * behave identically against a REAL R2 bucket served by Miniflare. It runs the
 * SAME `createApiApp()` tree the production Worker mounts, fetched through the
 * pool's `SELF` (the in-isolate entry in `tests/workers/worker.ts`).
 *
 * Kept deliberately small — health + readiness only. Deep behavioural coverage
 * lives in the node unit suite (under `src/api` and `src/server`); this suite
 * asserts the binding-wiring + dispatch path is live, not re-asserting every
 * contract.
 *
 * @see `src/test-utils/env.ts` — the fake R2 whose semantics this cross-checks.
 */
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("cloud-workers integration: health + readiness", () => {
	it("GET /v1/health returns ok against the real Worker entry", async () => {
		const res = await exports.default.fetch("http://tekmemo.test/v1/health");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			data: { ok: boolean; name: string };
		};
		expect(body.data).toMatchObject({ ok: true, name: "tekmemo-cloud" });
	});

	it("GET /v1/readiness reports ok because the REAL R2 binding is live", async () => {
		// The crux: `canReachR2` does `env.BLOBS.head("readiness-probe")`. In the
		// node unit suite the fake's `head` returns `null` but does not throw, so
		// readiness is `ok: true`. Against REAL Miniflare R2, `head` on a missing
		// key returns `null` too — so readiness must ALSO be `ok: true`. If the
		// fake ever diverges from real R2 here, this test fails.
		expect(env.BLOBS).toBeDefined();
		const res = await exports.default.fetch("http://tekmemo.test/v1/readiness");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			data: { ok: boolean; warnings?: string[] };
		};
		expect(body.data.ok).toBe(true);
		expect(body.data.warnings).toBeUndefined();
	});

	it("the REAL R2 bucket round-trips bytes the way the fake promises", async () => {
		// Direct binding proof: `put` then `get` returns the same bytes. The
		// fake's `get` slices out of the stored Uint8Array's buffer; real R2
		// streams a fresh `arrayBuffer()`. Both must yield the stored content.
		const key = "integration-roundtrip";
		const payload = new TextEncoder().encode("tekmemo-workers-r2");
		await env.BLOBS.put(key, payload);
		const obj = await env.BLOBS.get(key);
		// `get` returns `R2ObjectBody | null`; narrow explicitly so the read is
		// type-safe (Vitest's `expect().not.toBeNull()` does not narrow types).
		if (!obj) {
			throw new Error("expected R2 round-trip object to exist");
		}
		const bytes = new Uint8Array(await obj.arrayBuffer());
		expect(new TextDecoder().decode(bytes)).toBe("tekmemo-workers-r2");
		await env.BLOBS.delete(key);
	});
});

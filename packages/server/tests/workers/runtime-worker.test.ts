/**
 * Worker integration test — the runtime API against the REAL Worker target.
 *
 * @remarks
 * The s3-execution-plan slice-1 bar: "Miniflare where the target is a Worker."
 * Runs the SAME `createRuntimeFetchHandler` surface the production Worker
 * mounts (`tests/workers/worker.ts`), fetched through the pool's `SELF`. Proves
 * the fetch-handler + dispatch + HTTP wiring is live end-to-end against the
 * Worker target.
 *
 * The test entry mounts a runtime stub (see `worker.ts` header for why the real
 * `Tekmemo` can't load in workerd today — core's eager `node:fs` re-export is a
 * slice-9 concern). Deep behavioral coverage (recall round-trips, etc.) lives
 * in the `server-unit` pool, which runs on Node and loads the real runtime.
 */
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("server-workers integration: runtime API over Worker", () => {
	it("GET /health returns liveness JSON", async () => {
		const res = await SELF.fetch("http://tekmemo.test/health");
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; name: string };
		expect(body.ok).toBe(true);
		expect(body.name).toBe("tekmemo-server");
	});

	it("POST / dispatches a read method over the Worker", async () => {
		const res = await SELF.fetch("http://tekmemo.test/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "memory.readCore",
				params: {},
			}),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as { result: { content: string } };
		expect(body.result).toBeDefined();
	});

	it("a gated write returns HTTP 503 over the Worker", async () => {
		// The Hard ordering rule at the Worker layer: a mutating method returns
		// 503 so a client's retry logic engages. Proves the gate survives the
		// full Worker fetch-handler → dispatch → HTTP path.
		const res = await SELF.fetch("http://tekmemo.test/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "memory.write",
				params: { content: "should be gated" },
			}),
		});
		expect(res.status).toBe(503);
		const body = (await res.json()) as {
			error: { data: { httpStatus: number; reason: string } };
		};
		expect(body.error.data.httpStatus).toBe(503);
		expect(body.error.data.reason).toBe("concurrency_layer_required");
	});

	it("unknown method returns methodNotFound (200 body) over the Worker", async () => {
		const res = await SELF.fetch("http://tekmemo.test/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "nope",
				params: {},
			}),
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			error: { code: number };
		};
		expect(body.error.code).toBe(-32601);
	});
});

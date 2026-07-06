import { describe, expect, it } from "vitest";
import { createMemoFsCloudClient } from "../../src/cloud-client";

/**
 * @file Cloud-client route parity.
 *
 * The cloud is a **file replica**, not an engine (see
 * `docs/architecture/cloud-sync-and-refactor.md` §7). The frozen v1.0.0-alpha.0
 * client surface is exactly `health`, `readiness`, and the four file-based sync
 * methods (`sync.{push,complete,pull,status}`). The 12 engine namespaces that
 * existed in the pre-refactor client (memory, recall, context, graph,
 * extraction, evals, benchmarks, exports, snapshots, providers, agentSessions,
 * candidates, conflicts) are deleted — those operations run locally and never
 * hit the cloud. This test pins the post-refactor surface so a namespace cannot
 * silently come back.
 */
describe("Cloud Client Parity", () => {
	it("exposes only the file-replica surface: health, readiness, and sync", () => {
		const client = createMemoFsCloudClient({
			baseUrl: "http://localhost",
			apiKey: "tk_live_test",
		});

		// Survivors of the §7 trim.
		expect(typeof client.health).toBe("function");
		expect(typeof client.readiness).toBe("function");
		expect(typeof client.sync.push).toBe("function");
		expect(typeof client.sync.complete).toBe("function");
		expect(typeof client.sync.pull).toBe("function");
		expect(typeof client.sync.status).toBe("function");
	});

	it("does not expose any deleted engine namespace", () => {
		const client = createMemoFsCloudClient({
			baseUrl: "http://localhost",
			apiKey: "tk_live_test",
		}) as unknown as Record<string, unknown>;

		// Every namespace listed in §3.4 of the refactor doc must be gone.
		const deleted = [
			"memory",
			"recall",
			"context",
			"graph",
			"extraction",
			"evals",
			"benchmarks",
			"exports",
			"snapshots",
			"providers",
			"agentSessions",
			"candidates",
			"conflicts",
		];
		for (const namespace of deleted) {
			expect(client[namespace]).toBeUndefined();
		}
	});
});

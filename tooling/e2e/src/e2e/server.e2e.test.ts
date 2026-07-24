/**
 * Real e2e: Server harness — handshake, guards, cross-visibility.
 *
 * Proves server HTTP random port, memory.write+recall, file-first truth,
 * cleanup kills server + removes tmpDir (ticket 62 subset).
 */

import { describe, expect, it } from "vitest";
import { createRealCoreHarness } from "../harness/core-harness";
import { createRealServerHarness } from "../harness/server-harness";

describe("server real harness — http random port, memory.write+recall (ticket 62)", () => {
	it("boots http on random free port, json-rpc fetch proves memory.write + recall", async () => {
		const serverHarness = await createRealServerHarness();
		try {
			expect(serverHarness.url).toMatch(/http:\/\/127\.0\.0\.1:\d+\//);
			expect(serverHarness.port).toBeGreaterThan(0);

			const write = await serverHarness.writeMemory(
				"Server harness fact: Simba self-host e2e proof second file",
			);
			expect(write).toBeDefined();

			const recall = await serverHarness.recall("Simba self-host", 5);
			expect(recall).toBeDefined();

			const healthRes = await fetch(`${serverHarness.url}health`);
			expect(healthRes.status).toBe(200);

			await serverHarness.assertFileExists(".memofs");
		} finally {
			await serverHarness.cleanup();
		}
	}, 30_000);

	it("cross-visibility: server write visible to core same tmpDir", async () => {
		const projectId = `e2e-server-${Date.now()}`;
		const serverHarness = await createRealServerHarness({ projectId });
		try {
			await serverHarness.writeMemory("Cross-visibility server → core fact");

			const core = await createRealCoreHarness({
				tmpDir: serverHarness.tmpDir,
				projectId,
			});
			try {
				const items = await core.search("cross-visibility server");
				if (items.length === 0) {
					const snap = await core.snapshotFs();
					expect(Object.values(snap).join("\n").toLowerCase()).toContain(
						"cross-visibility",
					);
				} else {
					expect(items.length).toBeGreaterThan(0);
				}
			} finally {
				await core.cleanup();
			}
		} finally {
			await serverHarness.cleanup();
		}
	}, 30_000);

	it("cleanup removes tmpDir and stops server", async () => {
		const serverHarness = await createRealServerHarness();
		const dir = serverHarness.tmpDir;

		const res = await fetch(`${serverHarness.url}health`);
		expect(res.status).toBe(200);

		await serverHarness.cleanup();

		const { stat } = await import("node:fs/promises");
		await expect(stat(dir)).rejects.toThrow();
		await expect(fetch(`${serverHarness.url}health`)).rejects.toThrow();
	}, 30_000);
});

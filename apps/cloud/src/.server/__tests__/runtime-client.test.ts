import type { MemoFS } from "@memofs/core";
import { describe, expect, it } from "vitest";
import { createRuntimeClient, type RuntimeFactory } from "../runtime-client";

function fakeRuntime(calls: Array<{ method: string; value: unknown }>): MemoFS {
	return {
		async recall(query: string, options?: { limit?: number }) {
			calls.push({ method: "recall", value: { query, options } });
			return { items: [{ id: "core", text: "Core memory" }] };
		},
		async context(input: { query: string; detail?: "compact" | "full" }) {
			calls.push({ method: "context", value: input });
			return { text: "Context", sections: [] };
		},
		core: {
			async read() {
				calls.push({ method: "readCore", value: null });
				return "# Core Memory";
			},
		},
		notes: {
			async read() {
				calls.push({ method: "readNotes", value: null });
				return "# Notes";
			},
		},
		async listRecentMemories(input?: { limit?: number }) {
			calls.push({ method: "listRecent", value: input });
			return { items: [] };
		},
		async consolidate(input?: any) {
			calls.push({ method: "consolidate", value: input });
			return {
				plan: {
					merges: 0,
					retiredEdges: 0,
					retiredNodes: 0,
					changed: false,
					now: new Date().toISOString(),
				},
				mergesApplied: 0,
				retirementsApplied: 0,
				applied: true,
			};
		},
	} as unknown as MemoFS;
}

function clientWithFactory(factory: RuntimeFactory) {
	return createRuntimeClient({ createRuntime: factory });
}

describe("runtime-client", () => {
	it("recall calls the project runtime with query and options", async () => {
		const calls: Array<{ method: string; value: unknown }> = [];
		const client = clientWithFactory(() => fakeRuntime(calls));

		await expect(
			client.recall("proj-123", "auth", { limit: 3 }),
		).resolves.toEqual({
			items: [{ id: "core", text: "Core memory" }],
		});

		expect(calls).toEqual([
			{ method: "recall", value: { query: "auth", options: { limit: 3 } } },
		]);
	});

	it("context maps the task string to the core query input", async () => {
		const calls: Array<{ method: string; value: unknown }> = [];
		const client = clientWithFactory(() => fakeRuntime(calls));

		await client.context("proj", "summarize auth", { detail: "compact" });

		expect(calls).toEqual([
			{
				method: "context",
				value: { query: "summarize auth", detail: "compact" },
			},
		]);
	});

	it("read helpers return the core and notes documents directly", async () => {
		const calls: Array<{ method: string; value: unknown }> = [];
		const client = clientWithFactory(() => fakeRuntime(calls));

		await expect(client.readCore("proj")).resolves.toBe("# Core Memory");
		await expect(client.readNotes("proj")).resolves.toBe("# Notes");
	});

	it("listRecent forwards the optional limit", async () => {
		const calls: Array<{ method: string; value: unknown }> = [];
		const client = clientWithFactory(() => fakeRuntime(calls));

		await client.listRecent("proj", { limit: 5 });

		expect(calls).toEqual([{ method: "listRecent", value: { limit: 5 } }]);
	});

	it("consolidate forwards the optional apply flag", async () => {
		const calls: Array<{ method: string; value: unknown }> = [];
		const client = clientWithFactory(() => fakeRuntime(calls));

		await client.consolidate("proj", { apply: true });

		expect(calls).toEqual([{ method: "consolidate", value: { apply: true } }]);
	});

	it("caches one runtime per project for a client instance", async () => {
		let created = 0;
		const client = clientWithFactory(() => {
			created += 1;
			return fakeRuntime([]);
		});

		await client.readCore("proj-a");
		await client.readNotes("proj-a");
		await client.readCore("proj-b");

		expect(created).toBe(2);
	});
});

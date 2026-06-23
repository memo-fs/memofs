import { describe, expect, it } from "vitest";
import {
	createFsGraphStore,
	createFsRecallStore,
	createNodeFsMemoryStore,
} from "../../src/index";
import { createTempTekMemoDir } from "../../src/testing/temp-dir";

describe("FsRecallStore", () => {
	it("persists upserts to embeddings.jsonl and rehydrates into a new store", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});

			const first = createFsRecallStore({ store });
			await first.upsert([
				{
					id: "doc_1",
					text: "authentication login flow",
					embedding: [0.1, 0.2, 0.3],
					metadata: {
						projectId: "p1",
						sourceType: "note",
						sourceId: "n1",
						memoryType: "notes",
					},
				},
			]);

			// A second store over the same root must rehydrate the document.
			const second = createFsRecallStore({ store });
			const results = await second.query({
				embedding: [0.1, 0.2, 0.3],
				topK: 5,
			});
			expect(results.map((r) => r.id)).toContain("doc_1");
		} finally {
			await cleanup();
		}
	});

	it("supports delete and persists the change", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const recall = createFsRecallStore({ store });
			await recall.upsert([
				{
					id: "keep",
					text: "alpha",
					embedding: [1, 0],
					metadata: {
						projectId: "p1",
						sourceType: "note",
						sourceId: "n1",
						memoryType: "notes",
					},
				},
				{
					id: "drop",
					text: "beta",
					embedding: [0, 1],
					metadata: {
						projectId: "p1",
						sourceType: "note",
						sourceId: "n2",
						memoryType: "notes",
					},
				},
			]);

			await recall.delete(["drop"]);
			expect(await recall.count()).toBe(1);

			// Rehydrate in a fresh store and confirm persistence.
			const rehydrated = createFsRecallStore({ store });
			expect(await rehydrated.count()).toBe(1);
			const results = await rehydrated.query({ embedding: [1, 0], topK: 5 });
			expect(results.map((r) => r.id)).toEqual(["keep"]);
		} finally {
			await cleanup();
		}
	});
});

describe("FsGraphStore", () => {
	it("persists nodes and edges to JSONL and rehydrates into a new store", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});

			const first = createFsGraphStore({ store });
			await first.upsertNodes([
				{ id: "auth", type: "concept", label: "Authentication" },
				{ id: "jwt", type: "concept", label: "JWT" },
			]);
			await first.upsertEdges([
				{ from: "auth", to: "jwt", type: "uses", directed: true },
			]);

			const second = createFsGraphStore({ store });
			const node = await second.getNode("auth");
			expect(node?.label).toBe("Authentication");
			const neighbors = await second.neighbors({
				nodeId: "auth",
				direction: "out",
			});
			expect(neighbors.map((n) => n.node.id)).toContain("jwt");

			const stats = await second.stats();
			expect(stats.nodeCount).toBe(2);
			expect(stats.edgeCount).toBe(1);
		} finally {
			await cleanup();
		}
	});

	it("returns empty when no persisted graph exists", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const graph = createFsGraphStore({ store });
			const stats = await graph.stats();
			expect(stats.nodeCount).toBe(0);
			expect(await graph.getNode("missing")).toBeUndefined();
		} finally {
			await cleanup();
		}
	});

	it("hydrates is idempotent (only the first call reads disk)", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const graph = createFsGraphStore({ store });
			await graph.upsertNodes([{ id: "a", type: "concept", label: "A" }]);

			// Second store reads the file once; calling hydrate twice must not
			// duplicate or reset state.
			const second = createFsGraphStore({ store });
			await second.hydrate();
			await second.hydrate();
			expect((await second.stats()).nodeCount).toBe(1);
		} finally {
			await cleanup();
		}
	});

	it("rehydrates a directed edge with correct direction filtering", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const writer = createFsGraphStore({ store });
			await writer.upsertNodes([
				{ id: "api", type: "service", label: "API" },
				{ id: "db", type: "service", label: "DB" },
			]);
			// api → db (directed): out-neighbor of api is db, in-neighbor of db is api.
			await writer.upsertEdges([
				{ from: "api", to: "db", type: "calls", directed: true },
			]);

			const reader = createFsGraphStore({ store });
			const outNeighbors = await reader.neighbors({
				nodeId: "api",
				direction: "out",
			});
			expect(outNeighbors.map((n) => n.node.id)).toEqual(["db"]);
			expect(outNeighbors[0]?.direction).toBe("out");

			const inNeighbors = await reader.neighbors({
				nodeId: "db",
				direction: "in",
			});
			expect(inNeighbors.map((n) => n.node.id)).toEqual(["api"]);
			expect(inNeighbors[0]?.direction).toBe("in");

			// No out-neighbors from db (edge is directed api→db).
			const dbOut = await reader.neighbors({
				nodeId: "db",
				direction: "out",
			});
			expect(dbOut).toEqual([]);
		} finally {
			await cleanup();
		}
	});

	it("filters neighbors by edge type and minWeight", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const graph = createFsGraphStore({ store });
			await graph.upsertNodes([
				{ id: "hub", type: "concept", label: "Hub" },
				{ id: "uses", type: "concept", label: "Uses" },
				{ id: "heavy", type: "concept", label: "Heavy" },
			]);
			await graph.upsertEdges([
				{ from: "hub", to: "uses", type: "uses", directed: true, weight: 0.2 },
				{
					from: "hub",
					to: "heavy",
					type: "depends",
					directed: true,
					weight: 0.9,
				},
			]);

			// Only the "depends" edge survives the type filter.
			const typed = await graph.neighbors({
				nodeId: "hub",
				direction: "out",
				edgeTypes: ["depends"],
			});
			expect(typed.map((n) => n.node.id)).toEqual(["heavy"]);

			// minWeight prunes the low-weight "uses" edge.
			const weighted = await graph.neighbors({
				nodeId: "hub",
				direction: "out",
				minWeight: 0.5,
			});
			expect(weighted.map((n) => n.node.id)).toEqual(["heavy"]);
		} finally {
			await cleanup();
		}
	});

	it("survives a restart with re-indexed (upserted) nodes", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const writer = createFsGraphStore({ store });
			await writer.upsertNodes([{ id: "x", type: "concept", label: "Old" }]);
			// Re-upsert with a new label — last-write-wins, persisted.
			await writer.upsertNodes([{ id: "x", type: "concept", label: "New" }]);

			const reader = createFsGraphStore({ store });
			const node = await reader.getNode("x");
			expect(node?.label).toBe("New");
			expect((await reader.stats()).nodeCount).toBe(1);
		} finally {
			await cleanup();
		}
	});

	it("clear() removes nodes and edges and persists the empty state", async () => {
		const { rootDir, cleanup } = await createTempTekMemoDir();
		try {
			const store = createNodeFsMemoryStore({
				rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
			const writer = createFsGraphStore({ store });
			await writer.upsertNodes([{ id: "a", type: "concept", label: "A" }]);
			await writer.clear();

			const reader = createFsGraphStore({ store });
			expect((await reader.stats()).nodeCount).toBe(0);
			expect(await reader.getNode("a")).toBeUndefined();
		} finally {
			await cleanup();
		}
	});
});

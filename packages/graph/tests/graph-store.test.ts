import { describe, expect, it } from "vitest";
import {
	createInMemoryGraphStore,
	GraphConflictError,
	GraphNotFoundError,
	GraphValidationError,
} from "../src/index";
import { edge, node } from "./fixtures";

describe("graph-store", () => {
	it("upserts nodes and edges, then queries neighbors", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node(),
			node({
				id: "concept:local-first",
				type: "concept",
				label: "Local-first memory",
			}),
		]);
		const [storedEdge] = await graph.upsertEdges([edge()]);
		expect(storedEdge?.id.startsWith("edge:")).toBe(true);

		const neighbors = await graph.neighbors({
			nodeId: "project:tekmemo",
			direction: "out",
		});
		expect(neighbors.length).toBe(1);
		expect(neighbors[0]?.node.id).toBe("concept:local-first");
	});

	it("rejects duplicate node ids in one batch", async () => {
		const graph = createInMemoryGraphStore();
		await expect(() => graph.upsertNodes([node(), node()])).rejects.toThrow(
			GraphValidationError,
		);
	});

	it("rejects edges to unknown nodes by default", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([node()]);
		await expect(() => graph.upsertEdges([edge()])).rejects.toThrow(
			GraphNotFoundError,
		);
	});

	it("supports shortest path with depth cap", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
			node({ id: "c", label: "C" }),
		]);
		await graph.upsertEdges([
			edge({ from: "a", to: "b", type: "uses" }),
			edge({ from: "b", to: "c", type: "depends_on" }),
		]);

		expect(await graph.shortestPath({ from: "a", to: "c", maxDepth: 1 })).toBe(
			undefined,
		);
		const path = await graph.shortestPath({ from: "a", to: "c", maxDepth: 2 });
		expect(path?.steps.map((step) => step.node.id).join("->")).toBe("a->b->c");
	});

	it("mergeNodes rewires edges and preserves provenance-friendly aliases", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "project:tekmemo", label: "TekMemo", aliases: ["Tek Memo"] }),
			node({ id: "project:tek-memo", label: "Tek Memo" }),
			node({ id: "concept:graph", type: "concept", label: "Graph memory" }),
		]);
		await graph.upsertEdges([
			edge({ from: "project:tek-memo", to: "concept:graph", type: "uses" }),
		]);

		const merged = await graph.mergeNodes({
			sourceId: "project:tek-memo",
			targetId: "project:tekmemo",
		});
		expect(merged.aliases.includes("Tek Memo")).toBe(true);
		expect(await graph.getNode("project:tek-memo")).toBe(undefined);
		const neighbors = await graph.neighbors({ nodeId: "project:tekmemo" });
		expect(neighbors.some((item) => item.node.id === "concept:graph")).toBe(
			true,
		);
	});

	it("deleteNode can protect connected graph when cascade is disabled", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node(),
			node({
				id: "concept:local-first",
				type: "concept",
				label: "Local-first",
			}),
		]);
		await graph.upsertEdges([edge()]);
		await expect(() =>
			graph.deleteNode("project:tekmemo", { cascadeEdges: false }),
		).rejects.toThrow(GraphConflictError);
	});

	it("decayEdges lowers weight and deletes below threshold", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node(),
			node({
				id: "concept:local-first",
				type: "concept",
				label: "Local-first",
			}),
		]);
		await graph.upsertEdges([edge({ weight: 0.5 })]);
		const result = await graph.decayEdges({ factor: 0.5, minWeight: 0.3 });
		expect(result).toEqual({ updated: 0, deleted: 1 });
	});
});

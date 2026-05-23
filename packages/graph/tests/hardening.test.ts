import { describe, expect, it } from "vitest";
import {
	createInMemoryGraphStore,
	GraphParseError,
	GraphValidationError,
	parseGraphSnapshot,
	serializeGraphSnapshot,
} from "../src/index";
import { edge, node, storedEdge, storedNode } from "./fixtures";

describe("hardening", () => {
	it("source-aware edge identity preserves parallel claims from different sources", async () => {
		const graph = createInMemoryGraphStore({
			edgeIdentityMode: "source-aware",
		});
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
		]);

		const [first, second] = await graph.upsertEdges([
			edge({
				from: "a",
				to: "b",
				type: "uses",
				sourceRefs: [{ sourceType: "document", path: "a.md" }],
			}),
			edge({
				from: "a",
				to: "b",
				type: "uses",
				sourceRefs: [{ sourceType: "document", path: "b.md" }],
			}),
		]);

		expect(first?.id).not.toBe(second?.id);
		expect((await graph.queryEdges()).length).toBe(2);
	});

	it("explicit dedupeKey preserves parallel canonical edges", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
		]);
		const edges = await graph.upsertEdges([
			edge({ from: "a", to: "b", type: "uses", dedupeKey: "claim:1" }),
			edge({ from: "a", to: "b", type: "uses", dedupeKey: "claim:2" }),
		]);

		expect(edges[0]?.id).not.toBe(edges[1]?.id);
		expect(
			(await graph.neighbors({ nodeId: "a", direction: "out" })).length,
		).toBe(2);
	});

	it("canonical edge identity updates an existing semantic edge", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
		]);
		const [first] = await graph.upsertEdges([
			edge({ from: "a", to: "b", type: "uses", weight: 0.2 }),
		]);
		const [second] = await graph.upsertEdges([
			edge({ from: "a", to: "b", type: "uses", weight: 0.9 }),
		]);

		expect(first?.id).toBe(second?.id);
		expect((await graph.queryEdges()).length).toBe(1);
		expect(first?.id).toBeDefined();
		expect((await graph.getEdge(first!.id))?.weight).toBe(0.9);
	});

	it("weightedShortestPath prefers higher confidence route over fewer weak hops when cost is lower", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
			node({ id: "c", label: "C" }),
			node({ id: "d", label: "D" }),
		]);
		await graph.upsertEdges([
			edge({ from: "a", to: "d", type: "uses", weight: 0.1 }),
			edge({ from: "a", to: "b", type: "uses", weight: 0.95 }),
			edge({ from: "b", to: "c", type: "uses", weight: 0.95 }),
			edge({ from: "c", to: "d", type: "uses", weight: 0.95 }),
		]);

		const fewest = await graph.fewestHopsPath({
			from: "a",
			to: "d",
			maxDepth: 3,
		});
		const weighted = await graph.weightedShortestPath({
			from: "a",
			to: "d",
			maxDepth: 3,
		});

		expect(fewest?.steps.map((step) => step.node.id)).toEqual(["a", "d"]);
		expect(weighted?.steps.map((step) => step.node.id)).toEqual([
			"a",
			"b",
			"c",
			"d",
		]);
	});

	it("importSnapshot validates atomically and preserves existing graph on failure", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([node({ id: "safe", label: "Safe" })]);

		await expect(() =>
			graph.importSnapshot({
				version: 1,
				exportedAt: "2026-05-04T00:00:00.000Z",
				nodes: [storedNode({ id: "a", label: "A" })],
				edges: [storedEdge({ from: "a", to: "missing" })],
			}),
		).rejects.toThrow(GraphValidationError);

		expect((await graph.getNode("safe")) !== undefined).toBe(true);
	});

	it("parseGraphSnapshot deeply validates nodes and edges", () => {
		const bad = JSON.stringify({
			version: 1,
			exportedAt: "2026-05-04T00:00:00.000Z",
			nodes: [{ id: "a", type: "concept", label: "A" }],
			edges: [{ from: "a", to: "missing", type: "uses" }],
		});

		expect(() => parseGraphSnapshot(bad)).toThrow(GraphParseError);
	});

	it("serializeGraphSnapshot normalizes deep records", () => {
		const serialized = serializeGraphSnapshot({
			version: 1,
			exportedAt: "2026-05-04T00:00:00.000Z",
			nodes: [
				storedNode({ id: "a", label: "A" }),
				storedNode({ id: "b", label: "B" }),
			],
			edges: [storedEdge({ from: "a", to: "b", type: "uses" })],
		});
		const parsed = JSON.parse(serialized);
		expect(parsed.nodes[0].status).toBe("active");
		expect(parsed.edges[0].directed).toBe(true);
	});

	it("metadata rejects NaN, prototype pollution keys, and circular references", async () => {
		const graph = createInMemoryGraphStore({ requireExistingNodes: false });
		await expect(() =>
			graph.upsertNodes([node({ metadata: { bad: Number.NaN } as any })]),
		).rejects.toThrow(GraphValidationError);
		await expect(() =>
			graph.upsertNodes([
				node({ metadata: { constructor: "pollute" } as any }),
			]),
		).rejects.toThrow(GraphValidationError);

		const circular: Record<string, unknown> = {};
		circular.self = circular;
		await expect(() =>
			graph.upsertNodes([node({ metadata: circular as any })]),
		).rejects.toThrow(GraphValidationError);
	});

	it("source refs reject unsafe paths, protocols, and invalid spans", async () => {
		const graph = createInMemoryGraphStore({ requireExistingNodes: false });
		await expect(() =>
			graph.upsertNodes([
				node({
					sourceRefs: [{ sourceType: "document", path: "../secret.md" }],
				}),
			]),
		).rejects.toThrow(GraphValidationError);
		await expect(() =>
			graph.upsertNodes([
				node({
					sourceRefs: [{ sourceType: "document", url: "file:///tmp/secret" }],
				}),
			]),
		).rejects.toThrow(GraphValidationError);
		await expect(() =>
			graph.upsertNodes([
				node({
					sourceRefs: [{ sourceType: "document", span: { start: 10, end: 1 } }],
				}),
			]),
		).rejects.toThrow(GraphValidationError);
	});

	it("indexed delete and decay keep neighbor indexes consistent", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
			node({ id: "c", label: "C" }),
		]);
		const [ab, ac] = await graph.upsertEdges([
			edge({ from: "a", to: "b", type: "uses", weight: 0.8, dedupeKey: "ab" }),
			edge({ from: "a", to: "c", type: "uses", weight: 0.2, dedupeKey: "ac" }),
		]);

		expect(ab).toBeDefined();
		await graph.deleteEdge(ab!.id);
		expect(
			(await graph.neighbors({ nodeId: "a", direction: "out" })).map(
				(item) => item.node.id,
			),
		).toEqual(["c"]);

		await graph.decayEdges({ factor: 0.5, minWeight: 0.2 });
		expect(ac).toBeDefined();
		expect(await graph.getEdge(ac!.id)).toBe(undefined);
		expect(await graph.neighbors({ nodeId: "a", direction: "out" })).toEqual(
			[],
		);
	});
});

import { describe, expect, it } from "vitest";
import {
	createInMemoryGraphStore,
	expandFromEntities,
	GraphValidationError,
	isTekMemoGraphError,
	matchesMetadataFilter,
	parseGraphNodesJsonlDetailed,
} from "../src/index";
import { edge, node } from "./fixtures";

describe("production-edge-cases", () => {
	it("rejects malformed aliases instead of silently spreading strings", async () => {
		const graph = createInMemoryGraphStore({ requireExistingNodes: false });
		await expect(() =>
			graph.upsertNodes([
				node({ aliases: "not-an-array" as unknown as string[] }),
			]),
		).rejects.toThrow(GraphValidationError);
		await expect(() =>
			graph.upsertNodes([
				node({ aliases: ["valid", ""] as unknown as string[] }),
			]),
		).rejects.toThrow(GraphValidationError);
	});

	it("metadata filter is safe for circular filter values", () => {
		const circular: Record<string, unknown> = { value: "x" };
		circular.self = circular;
		expect(matchesMetadataFilter({ value: "x" }, { value: circular })).toBe(
			false,
		);
	});

	it("metadata filter compares object values independent of key insertion order", () => {
		expect(
			matchesMetadataFilter(
				{ nested: { a: 1, b: 2 } },
				{ nested: { b: 2, a: 1 } },
			),
		).toBe(true);
	});

	it("metadata filter rejects unsafe path keys", () => {
		expect(
			matchesMetadataFilter({ safe: true }, { "__proto__.polluted": true }),
		).toBe(false);
	});

	it("expandFromEntities does not repeatedly expand already visited cycles", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
			node({ id: "c", label: "C" }),
		]);
		await graph.upsertEdges([
			edge({ from: "a", to: "b", dedupeKey: "ab" }),
			edge({ from: "b", to: "a", dedupeKey: "ba" }),
			edge({ from: "b", to: "c", dedupeKey: "bc" }),
		]);

		const expanded = await expandFromEntities({
			store: graph,
			seedNodeIds: ["a"],
			depth: 4,
			direction: "out",
			limit: 20,
		});

		expect(expanded.nodes.map((item) => item.id).sort()).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(expanded.depthReached <= 3).toBe(true);
	});

	it("jsonl skip mode reports invalid validation rows without dropping valid rows", () => {
		const result = parseGraphNodesJsonlDetailed(
			`${JSON.stringify(node({ id: "safe", label: "Safe" }))}\n${JSON.stringify({ id: "bad", type: "concept" })}\n`,
			{ onInvalidLine: "skip" },
		);
		expect(result.rows.length).toBe(1);
		expect(result.rows[0]?.id).toBe("safe");
		expect(result.issues.length).toBe(1);
	});

	it("typed graph error guard identifies TekMemo graph errors", () => {
		const error = new GraphValidationError("bad graph");
		expect(isTekMemoGraphError(error)).toBe(true);
		expect(isTekMemoGraphError(new Error("generic"))).toBe(false);
	});
});

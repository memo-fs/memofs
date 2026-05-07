import { describe, expect, it } from "vitest";
import {
	createInMemoryGraphStore,
	expandFromEntities,
	resolveCurrentEdges,
	resolveCurrentNodes,
} from "../src/index";
import { edge, node } from "./fixtures";

describe("temporal", () => {
	it("temporal resolution excludes inactive and expired facts", () => {
		const now = "2026-05-04T00:00:00.000Z";
		expect(
			resolveCurrentNodes([node({ status: "deprecated" })], now).length,
		).toBe(0);
		expect(
			resolveCurrentEdges(
				[edge({ validUntil: "2020-01-01T00:00:00.000Z" })],
				now,
			).length,
		).toBe(0);
	});

	it("expands from seed entities with strict depth", async () => {
		const graph = createInMemoryGraphStore();
		await graph.upsertNodes([
			node({ id: "a", label: "A" }),
			node({ id: "b", label: "B" }),
			node({ id: "c", label: "C" }),
		]);
		await graph.upsertEdges([
			edge({ from: "a", to: "b" }),
			edge({ from: "b", to: "c" }),
		]);

		const depthOne = await expandFromEntities({
			store: graph,
			seedNodeIds: ["a"],
			depth: 1,
			direction: "out",
		});
		expect(depthOne.nodes.map((item) => item.id).sort()).toEqual(["a", "b"]);

		const depthTwo = await expandFromEntities({
			store: graph,
			seedNodeIds: ["a"],
			depth: 2,
			direction: "out",
		});
		expect(depthTwo.nodes.map((item) => item.id).sort()).toEqual([
			"a",
			"b",
			"c",
		]);
	});
});

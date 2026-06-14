import { describe, expect, it } from "vitest";
import {
	extractGraphFactsRuleBased,
	invalidateSupersededEdges,
	normalizeEdge,
} from "../../src/index";

describe("extraction", () => {
	it("rule-based extractor reads arrow triples and simple relation lines", () => {
		const result = extractGraphFactsRuleBased({
			text: `TekMemo -> uses -> Local-first memory\nTekMemo depends on TypeScript`,
			sourceRef: { sourceType: "document", path: ".tekmemo/memory/core.md" },
		});

		expect(result.edges.length).toBe(2);
		expect(result.edges[0]?.type).toBe("uses");
		expect(result.edges[1]?.type).toBe("depends_on");
		expect(result.nodes.length >= 3).toBe(true);
	});

	it("invalidateSupersededEdges deprecates target edge ids", () => {
		const oldEdge = normalizeEdge(
			{ id: "edge:old", from: "a", to: "b", type: "uses" },
			{ allowSelfEdges: true },
		);
		const supersedingEdge = normalizeEdge(
			{ from: "edge:new", to: "edge:old", type: "supersedes" },
			{ allowSelfEdges: true },
		);
		const result = invalidateSupersededEdges({
			edges: [oldEdge, supersedingEdge],
			now: "2026-05-04T00:00:00.000Z",
		});
		expect(result.find((item) => item.id === "edge:old")?.status).toBe(
			"deprecated",
		);
	});
});

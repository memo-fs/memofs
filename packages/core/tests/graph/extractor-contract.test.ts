import { describe, expect, it } from "vitest";
import {
	createRuleBasedExtractor,
	type ExtractionInput,
	type ExtractionResult,
	type Extractor,
} from "../../src/index";

/**
 * Contract every {@link Extractor} implementation must satisfy — written
 * against the rule-based adapter so it doubles as a reference for adapter
 * packages. Any future LLM extractor should pass this same suite.
 *
 * @see ADR 0004 — the rule-based extractor is the zero-config fallback; LLM
 *      extractors layer on top and must satisfy the same shape.
 */
describe("Extractor contract", () => {
	it("createRuleBasedExtractor returns an Extractor with a stable name", () => {
		const extractor = createRuleBasedExtractor();
		expect(extractor.name).toBe("rule-based");
		expect(typeof extractor.extract).toBe("function");
	});

	it("extract resolves to an ExtractionResult with nodes and edges", async () => {
		const extractor = createRuleBasedExtractor();
		const result = await extractor.extract({
			text: "MemoFS uses BM25\nMemoFS depends on TypeScript",
			sourceRef: { sourceType: "document", sourceId: "core" },
		});
		expect(isValidResult(result)).toBe(true);
		expect(result.nodes.length).toBeGreaterThanOrEqual(3);
		expect(result.edges).toHaveLength(2);
		expect(result.edges.map((e) => e.type)).toEqual(
			expect.arrayContaining(["uses", "depends_on"]),
		);
	});

	it("stamps provenance onto extracted nodes and edges", async () => {
		const extractor = createRuleBasedExtractor();
		const sourceRef = { sourceType: "document", sourceId: "core" };
		const result = await extractor.extract({
			text: "MemoFS uses BM25",
			sourceRef,
		});
		for (const node of result.nodes) {
			expect(node.sourceRefs?.[0]).toMatchObject(sourceRef);
		}
		for (const edge of result.edges) {
			expect(edge.sourceRefs?.[0]).toMatchObject(sourceRef);
		}
	});

	it("reports `supersedes` edges as contradictions for consolidation", async () => {
		const extractor = createRuleBasedExtractor();
		const result = await extractor.extract({
			text: "OAuth2 supersedes JWT",
		});
		expect(result.contradictions).toBeDefined();
		expect(result.contradictions?.length).toBeGreaterThan(0);
		expect(result.contradictions?.[0]?.type).toBe("supersedes");
	});

	it("produces no contradictions when there is no supersession", async () => {
		const extractor = createRuleBasedExtractor();
		const result = await extractor.extract({
			text: "MemoFS uses BM25",
		});
		expect(result.contradictions).toBeUndefined();
	});

	it("honors the defaultNodeType override", async () => {
		const extractor = createRuleBasedExtractor();
		const result = await extractor.extract({
			text: "Alice owns Backend",
			defaultNodeType: "entity",
		});
		expect(result.nodes.every((n) => n.type === "entity")).toBe(true);
	});

	it("honors the maxFacts ceiling", async () => {
		const extractor = createRuleBasedExtractor();
		const result = await extractor.extract({
			text: "a uses b\nc uses d\ne uses f",
			maxFacts: 1,
		});
		expect(result.edges.length).toBeLessThanOrEqual(1);
	});

	it("returns empty results for text with no recognizable facts", async () => {
		const extractor = createRuleBasedExtractor();
		const result = await extractor.extract({
			text: "Just some prose with no relations.",
		});
		expect(result.nodes).toEqual([]);
		expect(result.edges).toEqual([]);
	});

	it("any object implementing Extractor satisfies the call shape", async () => {
		// A minimal hand-written extractor (the shape a future adapter takes).
		const minimal: Extractor = {
			name: "minimal",
			async extract(input: ExtractionInput): Promise<ExtractionResult> {
				return {
					nodes: [
						{
							id: "x",
							type: input.defaultNodeType ?? "concept",
							label: "X",
						},
					],
					edges: [],
					model: "minimal-v1",
				};
			},
		};
		const result = await minimal.extract({ text: "anything" });
		expect(result.nodes[0]?.label).toBe("X");
		expect(result.model).toBe("minimal-v1");
	});
});

/** Structural check that an object is a valid {@link ExtractionResult}. */
function isValidResult(value: unknown): value is ExtractionResult {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return Array.isArray(v.nodes) && Array.isArray(v.edges);
}

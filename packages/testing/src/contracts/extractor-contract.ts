import { describe, expect, it } from "vitest";
import {
	cloneForMutationCheck,
	expectNoMutation,
} from "../assertions/assertions";
import {
	EXTRACTION_FACTS_TEXT_FIXTURE,
	EXTRACTION_NO_FACTS_TEXT_FIXTURE,
	EXTRACTION_SUPERSEDES_TEXT_FIXTURE,
} from "../fixtures/consolidation-fixtures";
import type {
	MinimalExtractionResult,
	MinimalExtractor,
	MinimalGraphSourceRef,
} from "../types/contracts";

export interface ExtractorContractOptions {
	name: string;
	createExtractor: () => Promise<MinimalExtractor> | MinimalExtractor;
	cleanup?: () => Promise<void> | void;
	/**
	 * Default node type the extractor assigns when `defaultNodeType` is unset.
	 * The rule-based extractor uses `"concept"`. Adapters may differ; this only
	 * affects the `defaultNodeType` override test.
	 */
	defaultNodeType?: string;
	/**
	 * Whether the extractor stamps `sourceRefs` onto every emitted node/edge.
	 * Set to `false` for adapters that defer provenance to a post-processing
	 * step (most should leave this `true`).
	 */
	stampsProvenance?: boolean;
	/**
	 * Whether the extractor surfaces `supersedes` facts as `contradictions`.
	 * The rule-based extractor does; LLM adapters are expected to as well.
	 */
	reportsContradictions?: boolean;
}

/**
 * Contract every {@link MinimalExtractor} implementation must satisfy.
 *
 * Generalizes the rule-based extractor's own suite (see `tekmemo`'s
 * `extractor-contract.test.ts`) so adapter packages can reuse the same
 * invariants: a stable name, one result per call, provenance stamping, and the
 * `supersedes` → `contradictions` seam consolidation depends on. The rule-based
 * extractor is the reference implementation; LLM adapters layer on top and must
 * pass this same suite.
 */
export function defineExtractorContractTests(
	options: ExtractorContractOptions,
): void {
	describe(`${options.name} Extractor contract`, () => {
		it("exposes a non-empty name and an extract function", async () => {
			const extractor = await options.createExtractor();
			try {
				expect(typeof extractor.name).toBe("string");
				expect(extractor.name.length).toBeGreaterThan(0);
				expect(typeof extractor.extract).toBe("function");
			} finally {
				await options.cleanup?.();
			}
		});

		it("extract resolves to a result with nodes and edges arrays", async () => {
			const extractor = await options.createExtractor();
			try {
				const result = await extractor.extract({
					text: EXTRACTION_FACTS_TEXT_FIXTURE,
					sourceRef: { sourceType: "document", sourceId: "core" },
				});
				expect(isValidResult(result)).toBe(true);
				expect(result.nodes.length).toBeGreaterThan(0);
				expect(result.edges.length).toBeGreaterThan(0);
			} finally {
				await options.cleanup?.();
			}
		});

		it("does not mutate the caller-owned input text", async () => {
			const extractor = await options.createExtractor();
			try {
				const text = EXTRACTION_FACTS_TEXT_FIXTURE;
				const before = cloneForMutationCheck({ text });
				await extractor.extract({ text });
				expectNoMutation(before, { text });
			} finally {
				await options.cleanup?.();
			}
		});

		if (options.stampsProvenance ?? true) {
			it("stamps the supplied sourceRef onto every emitted node and edge", async () => {
				const extractor = await options.createExtractor();
				try {
					const sourceRef: MinimalGraphSourceRef = {
						sourceType: "document",
						sourceId: "core",
					};
					const result = await extractor.extract({
						text: "TekMemo uses BM25",
						sourceRef,
					});
					for (const node of result.nodes) {
						expect(node.sourceRefs?.[0]).toMatchObject(sourceRef);
					}
					for (const edge of result.edges) {
						expect(edge.sourceRefs?.[0]).toMatchObject(sourceRef);
					}
				} finally {
					await options.cleanup?.();
				}
			});
		}

		if (options.reportsContradictions ?? true) {
			it("reports `supersedes` facts as contradictions for consolidation", async () => {
				const extractor = await options.createExtractor();
				try {
					const result = await extractor.extract({
						text: EXTRACTION_SUPERSEDES_TEXT_FIXTURE,
					});
					expect(result.contradictions).toBeDefined();
					expect(result.contradictions?.length).toBeGreaterThan(0);
					expect(result.contradictions?.[0]?.type).toBe("supersedes");
				} finally {
					await options.cleanup?.();
				}
			});

			it("produces no contradictions when there is no supersession", async () => {
				const extractor = await options.createExtractor();
				try {
					const result = await extractor.extract({
						text: "TekMemo uses BM25",
					});
					expect(result.contradictions).toBeUndefined();
				} finally {
					await options.cleanup?.();
				}
			});
		}

		it("honors the defaultNodeType override on extracted nodes", async () => {
			const extractor = await options.createExtractor();
			try {
				const result = await extractor.extract({
					text: "Alice owns Backend",
					defaultNodeType: "entity",
				});
				expect(result.nodes.length).toBeGreaterThan(0);
				expect(result.nodes.every((n) => n.type === "entity")).toBe(true);
			} finally {
				await options.cleanup?.();
			}
		});

		it("honors the maxFacts ceiling", async () => {
			const extractor = await options.createExtractor();
			try {
				const result = await extractor.extract({
					text: "a uses b\nc uses d\ne uses f",
					maxFacts: 1,
				});
				expect(result.edges.length).toBeLessThanOrEqual(1);
			} finally {
				await options.cleanup?.();
			}
		});

		it("returns empty nodes and edges for text with no recognizable facts", async () => {
			const extractor = await options.createExtractor();
			try {
				const result = await extractor.extract({
					text: EXTRACTION_NO_FACTS_TEXT_FIXTURE,
				});
				expect(result.nodes).toEqual([]);
				expect(result.edges).toEqual([]);
			} finally {
				await options.cleanup?.();
			}
		});
	});
}

/** Structural check that a value is a valid {@link MinimalExtractionResult}. */
function isValidResult(value: unknown): value is MinimalExtractionResult {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return Array.isArray(v.nodes) && Array.isArray(v.edges);
}

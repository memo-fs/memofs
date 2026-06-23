/**
 * Provider-neutral extractor contract for LLM-based graph extraction.
 *
 * @remarks
 * Mirrors the embedder/reranker adapter pattern: the {@link Extractor}
 * interface is defined here in core, and concrete implementations live in
 * adapter packages (e.g. a future `@tekbreed/tekmemo-adapter-extractor-
 * transformers` for zero-API-key local extraction, or `-openai`/`-voyage` for
 * hosted frontier quality). Honors `AGENTS.md`: "Core protocol contracts must
 * be provider-neutral."
 *
 * The result shape is a strict superset of {@link RuleBasedExtractionResult}
 * so the built-in rule-based extractor can satisfy this interface via
 * {@link createRuleBasedExtractor} — letting the write fan-out call *one*
 * shape whether or not an LLM extractor is configured. The rule-based
 * extractor stays the zero-config / offline fallback (ADR 0004); the LLM
 * extractor layers on top when an adapter is configured.
 *
 * The optional `contradictions` field is the seam memory consolidation
 * consumes: subject–predicate pairs the extractor detected as disagreeing
 * become `supersedes` edges during a consolidation pass (ADR 0004 — "resolve
 * contradictions via the existing `supersedes` edge type").
 *
 * @see ADR 0004 — v1 intelligence = LLM-based extraction + memory consolidation.
 * @see {@link MemoryEmbedder} — the precedent adapter interface this mirrors.
 * @see {@link RuleBasedExtractionResult} — the deterministic fallback shape.
 *
 * @public
 */

import type {
	GraphEdge,
	GraphNode,
	GraphNodeType,
	GraphSourceRef,
} from "../types";
import { extractGraphFactsRuleBased } from "./rule-based-extractor";

/** Input to an {@link Extractor.extract} call. */
export interface ExtractionInput {
	/** The text to extract facts/entities from. */
	text: string;
	/** Provenance for anything extracted (written onto node/edge `sourceRefs`). */
	sourceRef?: GraphSourceRef;
	/** Default node type assigned to extracted entities. Defaults to `"concept"`. */
	defaultNodeType?: GraphNodeType;
	/** Upper bound on facts extracted. Defaults to 100 (rule-based ceiling). */
	maxFacts?: number;
	/**
	 * Capability tier the extractor should target. Lets an adapter expose a
	 * fast/balanced/quality trade-off (e.g. a small local model for `fast`,
	 * a frontier API model for `quality`). Consolidation weights higher-tier
	 * output more strongly. Adapters may ignore modes they don't implement.
	 */
	mode?: "fast" | "balanced" | "quality";
}

/**
 * A detected contradiction: two facts (same subject + predicate, or a direct
 * `supersedes`/`replaces` relation) disagree. Emitted by an extractor when it
 * can tell, and consumed by the consolidation pass to emit `supersedes` edges.
 */
export interface ExtractionContradiction {
	/** Node id (or label) of the superseding fact's subject. */
	from: string;
	/** Node id (or label) of the superseded fact's subject. */
	to: string;
	/** Edge type describing the relationship (usually `"supersedes"`). */
	type: string;
}

/** Output of an {@link Extractor.extract} call. */
export interface ExtractionResult {
	/** Entities extracted from the text. */
	nodes: GraphNode[];
	/** Subject–predicate–object triples extracted from the text. */
	edges: GraphEdge[];
	/** Contradictions the extractor detected inline, if any. */
	contradictions?: ExtractionContradiction[];
	/** Adapter-declared model name (for provenance / health reporting). */
	model?: string;
	/** Token usage, when the adapter is API-backed. */
	usage?: {
		promptTokens?: number;
		totalTokens?: number;
	};
}

/**
 * Provider-neutral graph extractor contract.
 *
 * Implementations live in adapter packages. The built-in rule-based extractor
 * is exposed via {@link createRuleBasedExtractor} as the zero-config fallback.
 *
 * @public
 */
export interface Extractor {
	readonly name: string;
	extract(input: ExtractionInput): Promise<ExtractionResult>;
}

/**
 * Wraps the built-in rule-based extractor to satisfy the {@link Extractor}
 * contract. This is the zero-config / offline fallback (ADR 0004) used when no
 * LLM extractor adapter is configured — so the write fan-out always calls one
 * shape.
 *
 * @returns An {@link Extractor} backed by {@link extractGraphFactsRuleBased}.
 *
 * @public
 */
export function createRuleBasedExtractor(): Extractor {
	return {
		name: "rule-based",
		async extract(input: ExtractionInput): Promise<ExtractionResult> {
			const result = extractGraphFactsRuleBased({
				text: input.text,
				...(input.sourceRef === undefined
					? {}
					: { sourceRef: input.sourceRef }),
				...(input.defaultNodeType === undefined
					? {}
					: { defaultNodeType: input.defaultNodeType }),
				...(input.maxFacts === undefined ? {} : { maxFacts: input.maxFacts }),
			});
			// Rule-based extraction emits `supersedes` edges directly (one of its 7
			// patterns), so contradictions are already encoded as edges — no
			// separate list is produced here. Consolidation reads both shapes.
			const contradictions = result.edges
				.filter((edge) => edge.type === "supersedes")
				.map((edge) => ({
					from: edge.from,
					to: edge.to,
					type: edge.type,
				}));
			return {
				nodes: result.nodes,
				edges: result.edges,
				...(contradictions.length === 0 ? {} : { contradictions }),
				model: "rule-based",
			};
		},
	};
}

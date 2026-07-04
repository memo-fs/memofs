/**
 * Provider-neutral LLM transport contract (`LlmClient`).
 *
 * @remarks
 * The **fourth** member of the embedder/reranker/extractor contract family,
 * alongside {@link MemoryEmbedder}, {@link Reranker}, and {@link Extractor}.
 * Where those three are *domain* operations (embed, rerank, grow the graph),
 * `LlmClient` is the **transport** — "given a system prompt + user content
 * (+ optional JSON schema), return text or structured output." It is the
 * primitive every LLM-enhanced intelligence feature consumes: the retrieval
 * strategist (Q23 rewrite/resolve/filter/budget), writer-critic consolidation
 * (Q25a), staleness re-verification (Q24 v1.x), and semantic consolidation
 * (Q25a).
 *
 * The relationship to {@link Extractor} is the same as `RemoteBlobMemoryStore`
 * to `BlobClient` (domain logic over a transport contract): a provider's
 * `Extractor` impl composes an `LlmClient` internally, but the two contracts
 * stay separate. Extraction returns a typed domain object (`{ nodes, edges,
 * contradictions }`); an LLM call returns text/structured output. Collapsing
 * them would make the common case (graph extraction) pay for the general one.
 *
 * ## The deterministic-default seam
 *
 * There is **no built-in `LlmClient` implementation** in core, by design. Each
 * LLM-enhanced feature already locks a deterministic-default + adapter-enhanced
 * seam: the deterministic path (regex query rewrite, the deterministic
 * `consolidateGraph`, etc.) runs **zero-config when no `LlmClient` is
 * injected**; injecting an adapter (OpenAI today, Anthropic/local later) layers
 * the LLM-enhanced tier on top. The absence of an `LlmClient` *is* the
 * deterministic default — the same relationship `extractor` has to
 * `createRuleBasedExtractor`, expressed as "field absent → fallback," not as a
 * parallel built-in impl. An adapter's `Extractor` and `LlmClient` may share
 * one provider client internally (composition).
 *
 * Implementations live in adapter packages (e.g.
 * `@tekmemo/adapter-openai`). Honors `AGENTS.md`: "Core protocol
 * contracts must be provider-neutral."
 *
 * @see — the decision to add `LlmClient` as a contract distinct from
 * `Extractor`.
 * @see {@link Extractor} — the domain-extraction contract (kept separate).
 * @see {@link MemoryEmbedder} — the precedent adapter interface this mirrors.
 *
 * @public
 */

import type { JsonObject } from "../core/types/json";

/**
 * A JSON Schema describing the desired structured output.
 *
 * Provider-neutral: OpenAI's structured-output mode, Anthropic's tool-use
 * schema, and equivalent APIs all accept a JSON Schema object. Typed as
 * {@link JsonObject} (a JSON Schema is itself a JSON object) so the contract
 * carries no schema-library dependency. When passed to
 * {@link LlmClient.complete}, the adapter returns a validated
 * {@link LlmCompletionResult.structured} object; when omitted, the adapter
 * returns free-form {@link LlmCompletionResult.text}.
 */
export type LlmStructuredSchema = JsonObject;

/** Input to an {@link LlmClient.complete} call. */
export interface LlmCompletionInput {
	/**
	 * System/instruction prompt framing the assistant's behavior for the call
	 * (e.g. "You score whether two facts are consistent…"). Optional; many
	 * completion calls need only the user turn.
	 */
	system?: string;
	/** The user turn content — the prompt body (a query to rewrite, two facts to score, notes to merge). */
	user: string;
	/**
	 * Optional JSON Schema describing the desired structured output. When
	 * provided, the adapter returns a validated `structured` object; when
	 * omitted, the adapter returns free-form `text`. See
	 * {@link LlmStructuredSchema}.
	 */
	schema?: LlmStructuredSchema;
	/**
	 * Capability tier the client should target. Lets an adapter expose a
	 * fast/balanced/quality trade-off (e.g. a small local model for `fast`, a
	 * frontier API model for `quality`). Mirrors {@link ExtractionInput.mode}.
	 * Adapters may ignore modes they don't implement.
	 */
	mode?: "fast" | "balanced" | "quality";
}

/** Output of an {@link LlmClient.complete} call. */
export interface LlmCompletionResult {
	/**
	 * The completion text. Always present — even when a `schema` was requested,
	 * adapters surface the raw serialization here so a caller that wants text
	 * never has to branch on `structured`.
	 */
	text: string;
	/**
	 * The structured object parsed from the completion, when a `schema` was
	 * requested and the provider returned valid output. Absent when no schema
	 * was requested, or when the provider returned unparseable output (the
	 * defensive-parse contract: adapters never throw on malformed LLM output;
	 * they return `text` and omit `structured`, so the deterministic fallback
	 * stays reachable).
	 */
	structured?: JsonObject;
	/** Adapter-declared model name (for provenance / health reporting). */
	model?: string;
	/** Token usage, when the adapter is API-backed. */
	usage?: {
		promptTokens?: number;
		totalTokens?: number;
	};
}

/**
 * Provider-neutral LLM transport contract.
 *
 * Implementations live in adapter packages. There is no core default — the
 * deterministic-default seam is "no `LlmClient` injected → feature runs its
 * deterministic path" (see the module remarks).
 *
 * @public
 */
export interface LlmClient {
	readonly name: string;
	complete(input: LlmCompletionInput): Promise<LlmCompletionResult>;
}

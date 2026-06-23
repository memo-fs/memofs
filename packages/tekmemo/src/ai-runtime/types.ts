/**
 * Framework-neutral runtime contract for AI-framework integrations.
 *
 * @remarks
 * This is the single memory-runtime interface every TekMemo AI-framework
 * adapter implements (Vercel AI SDK today via `@tekbreed/tekmemo-adapter-ai-sdk`;
 * LangChain / OpenAI Agents SDK / Mastra later). It lives in core so that:
 *
 * 1. Core's public surface stays **provider-neutral** (AGENTS.md: "Core
 *    protocol contracts must be provider-neutral") — no Vercel/zod tool types
 *    leak into a user who only wants the memory engine.
 * 2. Each framework adapter implements the **same** contract, so memory
 *    semantics are identical across frameworks (no per-framework drift).
 *
 * It mirrors the embedder interface/impl split: the `Embedder` interface is a
 * core type; OpenAI/Voyage/transformers implementations are adapter packages.
 * `TekMemoMemoryRuntime` is the runtime equivalent of `Embedder`.
 *
 * Renamed from `TekMemoAiRuntime` (2026-06-20, ADR 0007) to drop the
 * AI-SDK-flavored naming from a core type. See ADR 0007.
 *
 * @public
 */

import type { JsonObject } from "../core/types/json";

/**
 * A document returned when reading or updating core memory.
 */
export interface MemoryRuntimeCoreMemoryDocument {
	content: string;
	updatedAt?: string;
	version?: number;
}

/**
 * The kind of a memory note (mirrors {@link MemoryKind} for the runtime surface).
 */
export type MemoryRuntimeNoteKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

/**
 * A single memory note surfaced through the runtime.
 */
export interface MemoryRuntimeNote {
	id: string;
	kind: MemoryRuntimeNoteKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * A page of results with an optional pagination cursor.
 */
export interface MemoryRuntimePage<T> {
	items: T[];
	nextCursor?: string;
}

/**
 * A single recall (retrieval) hit.
 */
export interface MemoryRuntimeRecallHit {
	id: string;
	text: string;
	score?: number;
	sourceType?: string;
	sourceId?: string;
	sourcePath?: string;
	metadata?: JsonObject;
}

/**
 * Strategy hint for recall. `"local"` = lexical/BM25+fuzzy only;
 * `"vector"` = embeddings only (when an embedder is configured);
 * `"hybrid"` = both (the default the {@link Tekmemo} class uses).
 */
export type MemoryRuntimeRecallStrategy = "local" | "vector" | "hybrid";

/**
 * Input to a recall query against the runtime.
 */
export interface MemoryRuntimeRecallInput {
	query: string;
	topK?: number;
	strategy?: MemoryRuntimeRecallStrategy;
	rerank?: boolean;
	fallback?: "none" | "local";
	filters?: JsonObject;
}

/**
 * Result of a recall query.
 */
export interface MemoryRuntimeRecallResult {
	items: MemoryRuntimeRecallHit[];
	strategy?: string;
	fallbackUsed?: boolean;
	warnings?: string[];
}

/**
 * Input for listing notes through the runtime.
 */
export interface MemoryRuntimeListNotesInput {
	limit?: number;
	cursor?: string;
	kind?: MemoryRuntimeNoteKind;
	tag?: string;
}

/**
 * Input for creating a note through the runtime.
 */
export interface MemoryRuntimeCreateNoteInput {
	kind?: MemoryRuntimeNoteKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
}

/**
 * Input for an optional re-index operation.
 */
export interface MemoryRuntimeIndexInput {
	mode?: "all" | "changed" | "core" | "notes";
	force?: boolean;
}

/**
 * Result of an optional re-index operation.
 */
export interface MemoryRuntimeIndexResult {
	jobId?: string;
	status: "queued" | "running" | "completed" | "skipped";
	indexed?: number;
	warnings?: string[];
}

/**
 * The framework-neutral memory runtime contract.
 *
 * Every AI-framework adapter implements this interface by bridging a
 * {@link Tekmemo} client (or any equivalent memory backend) into it. Methods
 * are pure memory operations — read/write core memory, list/create notes,
 * recall — with no framework-specific types. An optional {@link index} method
 * is allowed for runtimes that expose explicit re-indexing; when absent, the
 * adapter's tool layer must surface a clear "not supported" error.
 *
 * @public
 */
export interface TekMemoMemoryRuntime {
	readCoreMemory(
		signal?: AbortSignal,
	): Promise<MemoryRuntimeCoreMemoryDocument>;
	updateCoreMemory(
		input: { content: string },
		signal?: AbortSignal,
	): Promise<MemoryRuntimeCoreMemoryDocument>;
	listNotes(
		input?: MemoryRuntimeListNotesInput,
		signal?: AbortSignal,
	): Promise<MemoryRuntimePage<MemoryRuntimeNote>>;
	createNote(
		input: MemoryRuntimeCreateNoteInput,
		signal?: AbortSignal,
	): Promise<MemoryRuntimeNote>;
	recall(
		input: MemoryRuntimeRecallInput,
		signal?: AbortSignal,
	): Promise<MemoryRuntimeRecallResult>;
	/** Optional explicit re-index. Adapters may omit this. */
	index?(
		input?: MemoryRuntimeIndexInput,
		signal?: AbortSignal,
	): Promise<MemoryRuntimeIndexResult>;
}

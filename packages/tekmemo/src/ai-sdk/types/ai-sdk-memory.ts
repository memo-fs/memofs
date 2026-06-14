/**
 * Core types for the TekMemo AI SDK integration.
 *
 * @remarks
 * Defines memory stores, retrieval plans, and execution contexts
 * used by the AI SDK tooling layer.
 *
 * @internal
 */

import type { MemoryPath, MemoryStore } from "@tekbreed/tekmemo";
import type { MemoryHit, RetrievalPlan } from "./retrieval";

/**
 * Memory store instances for workspace and optionally user scope.
 */
export interface MemoryStores {
	/** Workspace-scoped memory store. */
	workspace: MemoryStore;
	/** Optional user-scoped memory store. */
	user?: MemoryStore;
}

/**
 * Input for building the memory text passed to AI SDK.
 */
export interface BuildPrepareCallMemoryTextInput {
	/** Base instructions for the AI. */
	baseInstructions: string;
	/** Plan describing what memory to retrieve. */
	retrievalPlan: RetrievalPlan;
	/** Memory stores to read from. */
	stores: MemoryStores;
	/** Optional pre-fetched recall hits. */
	recallHits?: {
		workspace?: MemoryHit[];
		user?: MemoryHit[];
	};
}

/**
 * Execution context for the memory tool.
 */
export interface MemoryToolExecutionContext {
	/** The memory store to operate on. */
	store: MemoryStore;
}

/** Alias for a valid memory path that can be safely read. */
export type SafeReadableMemoryPath = MemoryPath;

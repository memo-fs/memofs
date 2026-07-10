/**
 * Testing utilities for MemoFS packages.
 *
 * @remarks
 * Provides contract tests, fake implementations, fixtures, and assertion helpers
 * used across all MemoFS package tests. This package is **public and stable** —
 * adapter authors depend on it to run the contract suites shipped from core.
 *
 * @public
 */

export {
	cloneForMutationCheck,
	expectFiniteNumber,
	expectNoMutation,
	expectSortedDescending,
	expectVector,
} from "./assertions/assertions";
export * from "./contracts/index";
export * from "./fakes/index";
export * from "./fixtures/index";
export type {
	MinimalBlobClient,
	MinimalBlobEntry,
	MinimalEmbedder,
	MinimalExtractionContradiction,
	MinimalExtractionInput,
	MinimalExtractionResult,
	MinimalExtractor,
	MinimalGraphEdge,
	MinimalGraphNode,
	MinimalGraphSourceRef,
	MinimalLlmClient,
	MinimalLlmCompletionInput,
	MinimalLlmCompletionResult,
	MinimalLlmStructuredSchema,
	MinimalMemoryStore,
	MinimalMetadataStore,
	MinimalRecallDocument,
	MinimalRecallQuery,
	MinimalRecallResult,
	MinimalRecallStore,
	MinimalRerankDocument,
	MinimalReranker,
	MinimalRerankResult,
} from "./types/contracts";

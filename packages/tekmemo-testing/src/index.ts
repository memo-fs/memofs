/**
 * Testing utilities for TekMemo packages.
 *
 * @remarks
 * Provides contract tests, fake implementations, fixtures, and assertion helpers
 * used across all TekMemo package tests.
 *
 * @internal
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
	MinimalEmbedder,
	MinimalMemoryStore,
	MinimalRecallDocument,
	MinimalRecallQuery,
	MinimalRecallResult,
	MinimalRecallStore,
	MinimalRerankDocument,
	MinimalReranker,
	MinimalRerankResult,
} from "./types/contracts";

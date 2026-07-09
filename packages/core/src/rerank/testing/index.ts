/**
 * @packageDocumentation
 * Testing utilities for the @memofs/core/rerank package.
 *
 * @remarks
 * This module provides a fake reranker implementation that can be used in unit tests
 * to avoid depending on external reranking providers.
 *
 * @internal
 */

export type { FakeRerankerOptions } from "./fake-reranker";
export { createFakeReranker, FakeReranker } from "./fake-reranker";

/**
 * @file Testing utilities for @memofs/adapter-voyage.
 *
 * @remarks
 * Re-exports the fake Voyage AI clients (embedder + reranker) so consumers
 * can import them from a single top-level subpath: `@memofs/adapter-voyage/testing`.
 *
 * @public
 */

export {
	createFakeVoyageClient,
	FakeVoyageClient,
	type FakeVoyageClientOptions,
} from "../embedder/testing";
export {
	createFakeVoyageRerankClient,
	FakeVoyageRerankClient,
	type FakeVoyageRerankClientOptions,
} from "../reranker/testing";

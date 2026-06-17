/**
 * @file Testing utilities for Voyage AI rerank adapter.
 *
 * @remarks
 * This module provides exports for testing utilities including a fake
 * (mock) Voyage AI rerank client that can be used in unit tests
 * without making actual API calls.
 *
 * @public
 */

export type { FakeVoyageRerankClientOptions } from "./fake-voyage-rerank-client";
export {
	createFakeVoyageRerankClient,
	FakeVoyageRerankClient,
} from "./fake-voyage-rerank-client";

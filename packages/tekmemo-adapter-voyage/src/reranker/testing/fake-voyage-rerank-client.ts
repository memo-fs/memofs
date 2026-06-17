/**
 * @file Fake (mock) Voyage AI rerank client for testing.
 *
 * @remarks
 * This module provides a fake implementation of the VoyageRerankClient
 * that can be configured to return predefined responses or errors.
 * Useful for unit testing without making actual API calls.
 *
 * @internal
 */

import type {
	VoyageRerankClient,
	VoyageRerankRequest,
	VoyageRerankResponse,
} from "../types";

/**
 * Configuration options for the fake Voyage rerank client.
 *
 * @public
 */
export interface FakeVoyageRerankClientOptions {
	/** Predefined relevance scores to return for each document (in order). */
	scores?: number[];
	/** Error to throw instead of returning a response. */
	failWith?: Error;
	/** Predefined response data to return. */
	responseData?: VoyageRerankResponse["data"];
}

/**
 * Fake (mock) implementation of VoyageRerankClient for testing.
 *
 * @public
 * @remarks
 * This client records all requests made to it and can be configured
 * to return predefined responses or throw errors for testing error handling.
 */
export class FakeVoyageRerankClient implements VoyageRerankClient {
	/** Array of all requests made to this client, in order. */
	readonly requests: VoyageRerankRequest[] = [];
	/** Predefined scores to return. */
	private readonly scores: number[] | undefined;
	/** Error to throw on rerank calls. */
	private readonly failWith: Error | undefined;
	/** Predefined response data to return. */
	private readonly responseData: VoyageRerankResponse["data"] | undefined;

	/**
	 * Creates a new FakeVoyageRerankClient.
	 *
	 * @param options - Configuration options for the fake client.
	 */
	constructor(options?: FakeVoyageRerankClientOptions) {
		this.scores = options?.scores;
		this.failWith = options?.failWith;
		this.responseData = options?.responseData;
	}

	/**
	 * Simulates a rerank request, recording the request and returning configured response.
	 *
	 * @param request - The rerank request to process.
	 * @returns A promise that resolves to a fake rerank response.
	 * @throws The configured error if `failWith` was set in options.
	 */
	async rerank(request: VoyageRerankRequest): Promise<VoyageRerankResponse> {
		this.requests.push(structuredCloneSafe(request));

		if (this.failWith) {
			throw this.failWith;
		}

		if (this.responseData) {
			return {
				data: structuredCloneSafe(this.responseData),
				model: request.model,
			};
		}

		const data = request.documents.map((document, index) => ({
			index,
			relevance_score: this.scores?.[index] ?? 1 / (index + 1),
			document,
		}));

		data.sort((a, b) => b.relevance_score - a.relevance_score);

		return {
			data: data.slice(0, request.top_k ?? data.length),
			model: request.model,
			usage: {
				total_tokens:
					request.documents.join(" ").split(/\s+/).length +
					request.query.split(/\s+/).length,
			},
		};
	}
}

/**
 * Creates a new FakeVoyageRerankClient instance.
 *
 * @public
 * @param options - Configuration options for the fake client.
 * @returns A configured FakeVoyageRerankClient instance.
 */
export function createFakeVoyageRerankClient(
	options?: FakeVoyageRerankClientOptions,
): FakeVoyageRerankClient {
	return new FakeVoyageRerankClient(options);
}

/**
 * Creates a deep clone of a value using JSON serialization.
 *
 * @internal
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 */
function structuredCloneSafe<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

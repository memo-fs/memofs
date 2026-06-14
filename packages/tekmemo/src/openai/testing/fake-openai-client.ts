import type {
	OpenAIEmbeddingsClient,
	OpenAIEmbeddingsRequest,
	OpenAIEmbeddingsResponse,
} from "../types";

/**
 * @file Fake OpenAI client for testing purposes.
 *
 * @remarks
 * This module provides a fake implementation of the OpenAI embeddings client
 * that can be used in tests to avoid making actual API calls.
 *
 * @internal
 */

/**
 * Configuration options for the fake OpenAI client.
 *
 * @public
 */
export interface FakeOpenAIClientOptions {
	/** The number of dimensions for generated embedding vectors. @defaultValue 4 */
	dimensions?: number;
	/** If set, the client will throw this error instead of returning embeddings. */
	failWith?: Error;
	/** Offset to apply to the response count (for testing edge cases). @defaultValue 0 */
	responseCountOffset?: number;
	/** Base value for generated vector elements. @defaultValue 0.1 */
	vectorValue?: number;
	/** If true, the response data will be shuffled (for testing order handling). @defaultValue false */
	shuffleResponse?: boolean;
}

/**
 * Fake implementation of OpenAIEmbeddingsClient for testing.
 *
 * @remarks
 * This client generates deterministic fake embeddings without making API calls.
 * Useful for unit tests that need to verify embedding behavior.
 *
 * @public
 */
export class FakeOpenAIEmbeddingsClient implements OpenAIEmbeddingsClient {
	/** Record of all requests made to this client. */
	readonly requests: OpenAIEmbeddingsRequest[] = [];

	private dimensions: number;
	private failWith: Error | undefined;
	private responseCountOffset: number;
	private vectorValue: number;
	private shuffleResponse: boolean;

	/**
	 * Creates a new FakeOpenAIEmbeddingsClient.
	 *
	 * @param options - Configuration options for the fake client.
	 */
	constructor(options?: FakeOpenAIClientOptions) {
		this.dimensions = options?.dimensions ?? 4;
		this.failWith = options?.failWith;
		this.responseCountOffset = options?.responseCountOffset ?? 0;
		this.vectorValue = options?.vectorValue ?? 0.1;
		this.shuffleResponse = options?.shuffleResponse ?? false;
	}

	/**
	 * Creates fake embeddings for the given request.
	 *
	 * @param request - The embeddings request (input texts and model).
	 * @returns A promise that resolves to fake embeddings response.
	 * @throws The error specified in failWith option, if set.
	 */
	async createEmbeddings(
		request: OpenAIEmbeddingsRequest,
	): Promise<OpenAIEmbeddingsResponse> {
		this.requests.push(structuredCloneSafe(request));

		if (this.failWith) {
			throw this.failWith;
		}

		const count = Math.max(0, request.input.length + this.responseCountOffset);
		const data = Array.from({ length: count }, (_, index) => ({
			object: "embedding",
			index,
			embedding: Array.from(
				{ length: this.dimensions },
				(_value, dim) => this.vectorValue + index + dim / 100,
			),
		}));

		if (this.shuffleResponse) {
			data.reverse();
		}

		return {
			object: "list",
			model: request.model,
			data,
			usage: {
				prompt_tokens: request.input.reduce(
					(sum, text) => sum + Math.max(1, text.split(/\s+/).length),
					0,
				),
				total_tokens: request.input.reduce(
					(sum, text) => sum + Math.max(1, text.split(/\s+/).length),
					0,
				),
			},
		};
	}

	/**
	 * Sets the dimensions for generated embedding vectors.
	 *
	 * @param dimensions - The number of dimensions for embeddings.
	 */
	setDimensions(dimensions: number): void {
		this.dimensions = dimensions;
	}

	/**
	 * Sets an error that will be thrown on the next createEmbeddings call.
	 *
	 * @param error - The error to throw, or undefined to clear.
	 */
	setFailure(error: Error | undefined): void {
		this.failWith = error;
	}
}

/**
 * Factory function to create a new FakeOpenAIEmbeddingsClient.
 *
 * @param options - Configuration options for the fake client.
 * @returns A new FakeOpenAIEmbeddingsClient instance.
 * @public
 */
export function createFakeOpenAIClient(
	options?: FakeOpenAIClientOptions,
): FakeOpenAIEmbeddingsClient {
	return new FakeOpenAIEmbeddingsClient(options);
}

/**
 * Creates a deep clone of a value using JSON serialization.
 *
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 * @internal
 */
function structuredCloneSafe<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

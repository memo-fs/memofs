import type {
	VoyageClient,
	VoyageEmbeddingsRequest,
	VoyageEmbeddingsResponse,
} from "../types";

export interface FakeVoyageClientOptions {
	dimensions?: number;
	failWith?: Error;
	responseCountOffset?: number;
	vectorValue?: number;
	malformedEmbeddingAt?: number;
}

export class FakeVoyageClient implements VoyageClient {
	readonly requests: VoyageEmbeddingsRequest[] = [];

	private dimensions: number;
	private failWith?: Error;
	private responseCountOffset: number;
	private vectorValue: number;
	private malformedEmbeddingAt?: number;

	constructor(options?: FakeVoyageClientOptions) {
		this.dimensions = options?.dimensions ?? 4;
		this.failWith = options?.failWith;
		this.responseCountOffset = options?.responseCountOffset ?? 0;
		this.vectorValue = options?.vectorValue ?? 0.1;
		this.malformedEmbeddingAt = options?.malformedEmbeddingAt;
	}

	async createEmbeddings(
		request: VoyageEmbeddingsRequest,
	): Promise<VoyageEmbeddingsResponse> {
		this.requests.push(structuredCloneSafe(request));

		if (this.failWith) {
			throw this.failWith;
		}

		const count = request.input.length + this.responseCountOffset;

		return {
			object: "list",
			model: request.model,
			data: Array.from({ length: Math.max(0, count) }, (_, index) => ({
				object: "embedding",
				index,
				embedding:
					this.malformedEmbeddingAt === index
						? ([0.1, Number.NaN] as number[])
						: Array.from(
								{ length: this.dimensions },
								(_value, dim) => this.vectorValue + index + dim / 100,
							),
			})),
			usage: {
				total_tokens: request.input.reduce(
					(sum, text) => sum + Math.max(1, text.split(/\s+/).length),
					0,
				),
			},
		};
	}

	setDimensions(dimensions: number): void {
		this.dimensions = dimensions;
	}

	setFailure(error: Error | undefined): void {
		this.failWith = error;
	}
}

export function createFakeVoyageClient(
	options?: FakeVoyageClientOptions,
): FakeVoyageClient {
	return new FakeVoyageClient(options);
}

function structuredCloneSafe<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

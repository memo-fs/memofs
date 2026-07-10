import { chunkArray } from "@repo/utils";
import { createVoyageClient } from "../client/voyage-client";
import { VoyageValidationError } from "../errors/voyage-errors";
import {
	assertValidOutputDimension,
	expectedVectorLength,
} from "../models/models";
import type {
	EmbeddingRecord,
	EmbedTextsInput,
	EmbedTextsResult,
	MemoryEmbedder,
	VoyageClient,
	VoyageEmbedderConfig,
} from "../types";
import {
	normalizeBatchSize,
	resolveApiKeyOrClient,
	validateEmbeddingsResponse,
	validateModel,
	validateTexts,
} from "../utils/validation";

export class VoyageEmbedder implements MemoryEmbedder {
	private readonly client: VoyageClient;
	private readonly defaultModel: string;
	private readonly config: VoyageEmbedderConfig;

	constructor(config: VoyageEmbedderConfig) {
		resolveApiKeyOrClient(config);

		if (config.client) {
			this.client = config.client;
		} else {
			const apiKey = config.apiKey;
			if (!apiKey) {
				throw new VoyageValidationError("Voyage apiKey is required.");
			}
			this.client = createVoyageClient({
				apiKey,
				baseUrl: config.baseUrl,
				fetch: config.fetch,
				timeoutMs: config.timeoutMs,
				retry: config.retry,
				userAgent: config.userAgent,
			});
		}

		this.defaultModel = config.model ?? "voyage-4-lite";
		validateModel(this.defaultModel);
		this.config = config;
	}

	async embedText(
		text: string,
		options?: Omit<EmbedTextsInput, "texts">,
	): Promise<EmbeddingRecord> {
		const result = await this.embedTexts({
			...options,
			texts: [text],
		});

		const first = result.embeddings[0];
		if (!first) {
			throw new VoyageValidationError(
				"Voyage returned no embedding for single input.",
			);
		}
		return first;
	}

	async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
		validateTexts(input.texts, {
			allowEmptyText: input.allowEmptyText ?? this.config.allowEmptyText,
		});

		if (input.texts.length === 0) {
			return {
				embeddings: [],
				model: input.model ?? this.defaultModel,
				usage: { totalTokens: 0 },
			};
		}

		const model = input.model ?? this.defaultModel;
		validateModel(model);

		const outputDimension =
			input.outputDimension ?? this.config.outputDimension;
		const outputDtype = input.outputDtype ?? this.config.outputDtype ?? "float";
		const expectedDimensions =
			input.expectedDimensions ??
			this.config.expectedDimensions ??
			expectedVectorLength({
				outputDimension,
				outputDtype,
			});

		if (
			input.encodingFormat === "base64" ||
			this.config.encodingFormat === "base64"
		) {
			throw new VoyageValidationError(
				"base64 encoding_format is not supported by VoyageEmbedder because MemoFS expects numeric vectors.",
			);
		}

		assertValidOutputDimension({
			model,
			outputDimension,
			allowUnknownModelDimensions: this.config.allowUnknownModelDimensions,
		});

		const batchSize = normalizeBatchSize(
			input.batchSize ?? this.config.batchSize,
		);
		const batches = chunkArray(
			input.texts.map((text, originalIndex) => ({ text, originalIndex })),
			batchSize,
		);
		const all: EmbeddingRecord[] = [];
		let totalTokens = 0;

		for (const batch of batches) {
			const response = await this.client.createEmbeddings({
				input: batch.map((item) => item.text),
				model,
				input_type: input.inputType ?? this.config.defaultInputType ?? null,
				truncation: input.truncation ?? this.config.truncation ?? true,
				output_dimension: outputDimension,
				output_dtype: outputDtype,
				encoding_format: null,
			});

			validateEmbeddingsResponse(response, {
				expectedCount: batch.length,
				expectedDimensions,
			});

			totalTokens +=
				typeof response.usage?.total_tokens === "number"
					? response.usage.total_tokens
					: 0;

			response.data.forEach((item, batchIndex) => {
				const original = batch[batchIndex];
				if (!original) {
					throw new VoyageValidationError(
						"Internal batching error: missing original item.",
					);
				}

				all.push({
					text: original.text,
					embedding: [...item.embedding],
					index: original.originalIndex,
					model: response.model ?? model,
					inputType: input.inputType ?? this.config.defaultInputType ?? null,
					dimensions: item.embedding.length,
				});
			});
		}

		all.sort((a, b) => a.index - b.index);

		return {
			embeddings: all,
			model,
			usage: { totalTokens },
		};
	}
}

export function createVoyageEmbedder(
	config: VoyageEmbedderConfig,
): VoyageEmbedder {
	return new VoyageEmbedder(config);
}
